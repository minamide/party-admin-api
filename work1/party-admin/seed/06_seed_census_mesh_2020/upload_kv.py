#!/usr/bin/env python3
"""
upload_kv.py

短い説明:
 CSV を読み、各行を JSON 化して Cloudflare Workers KV に登録する。
 必須環境変数: CF_ACCOUNT_ID, CF_NAMESPACE_ID, CF_API_TOKEN
 依存: requests  -> pip install requests

実行例:
 CF_ACCOUNT_ID=... CF_NAMESPACE_ID=... CF_API_TOKEN=... python upload_kv.py --indir census_mesh_2020_data --skip-existing --dry-run
"""

import os
import sys
import argparse
import time
import json
import csv
import glob
import re
import requests
import subprocess
from typing import Optional
from concurrent.futures import ThreadPoolExecutor, as_completed
import shutil

ENCODINGS = ['utf-8-sig', 'utf-8', 'cp932', 'shift_jis', 'euc_jp']
KV_KEY_PREFIX = 'census_mesh_2020:'
SIZE_WARNING_BYTES = 25 * 1024 * 1024  # 25MB

def norm_header(h: str) -> str:
    h = h.strip()
    return re.sub(r'[^0-9a-z]+', '_', h.lower())

def clean_raw_value(raw: Optional[str]) -> Optional[str]:
    if raw is None:
        return None
    s = raw.strip().strip('\u3000')
    if s == '' or s == '*' or s == '\u3000':
        return None
    return s

def try_int_conversion(s: Optional[str]) -> Optional[int]:
    if s is None:
        return None
    s2 = s.replace(',', '')
    if re.fullmatch(r'-?\d+', s2):
        try:
            return int(s2)
        except Exception:
            return None
    return None

def read_csv_with_encoding(path: str):
    last_exc = None
    for enc in ENCODINGS:
        try:
            with open(path, 'r', encoding=enc, newline='') as f:
                reader = csv.DictReader(f)
                rows = list(reader)
                if reader.fieldnames is None:
                    raise ValueError("no header")
                return reader.fieldnames, rows, enc
        except Exception as e:
            last_exc = e
            continue
    raise last_exc


def read_csv_stream(path: str):
    """Open CSV and return (fieldnames, iterator_of_rows, encoding).

    The iterator is a csv.DictReader which yields rows lazily so the caller
    can process rows while the file is being read and report progress.
    """
    last_exc = None
    for enc in ENCODINGS:
        try:
            f = open(path, 'r', encoding=enc, newline='')
            reader = csv.DictReader(f)
            if reader.fieldnames is None:
                f.close()
                raise ValueError('no header')
            return reader.fieldnames, reader, enc
        except Exception as e:
            last_exc = e
            continue
    raise last_exc

def request_with_retry(method, url, headers, data=None, params=None, max_retries=3, timeout=30):
    attempt = 0
    while True:
        try:
            resp = requests.request(method, url, headers=headers, data=data, params=params, timeout=timeout)
            if 200 <= resp.status_code < 300 or resp.status_code == 404:
                return resp
        except requests.RequestException:
            resp = None
        attempt += 1
        if attempt > max_retries:
            return resp
        sleep = (2 ** (attempt - 1)) * 0.5
        time.sleep(sleep)

def find_key_field(fieldnames):
    for f in fieldnames:
        if f.strip().upper() == 'KEY_CODE':
            return f
    return fieldnames[0]

def process_row_to_json(fieldnames, row, to_array_htksaki=False):
    out = {}
    for orig_h in fieldnames:
        norm_h = norm_header(orig_h)
        raw = row.get(orig_h)
        cleaned = clean_raw_value(raw)
        if orig_h.strip().upper() == 'HTKSAKI' or norm_h == 'htk_saki':
            if cleaned is None:
                val = None
            else:
                if to_array_htksaki:
                    val = [p for p in re.split(r'[;，、]', cleaned) if p != '']
                else:
                    val = cleaned
        else:
            num = try_int_conversion(cleaned)
            if num is not None:
                val = num
            else:
                val = cleaned
        out[norm_h] = val
    return out

def load_checkpoint(path):
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return None

def save_checkpoint(path, data):
    tmp = path + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False)
    os.replace(tmp, path)

def wrangler_get(ns: str, key: str, max_retries=3) -> Optional[int]:
    # returncode 0 means exists, 1 or non-zero means not found/error
    attempt = 0
    while True:
        try:
            # add timeout and capture output to avoid hanging subprocess
            p = subprocess.run(['wrangler', 'kv:key', 'get', ns, key], capture_output=True, text=True, timeout=30)
            # wrangler returns 0 when found; non-zero otherwise
            return p.returncode
        except FileNotFoundError:
            return None
        except Exception:
            attempt += 1
            if attempt > max_retries:
                return None
            time.sleep((2 ** (attempt - 1)) * 0.5)

def wrangler_put(ns: str, key: str, payload: bytes, max_retries=3) -> bool:
    attempt = 0
    while True:
        try:
            # use '-' to read value from stdin
            p = subprocess.run(['wrangler', 'kv:key', 'put', ns, key, '-'], input=payload, capture_output=True, text=True, timeout=60)
            if p.returncode == 0:
                return True
            # else treat as retryable
        except FileNotFoundError:
            return False
        except Exception:
            pass
        attempt += 1
        if attempt > max_retries:
            return False
        time.sleep((2 ** (attempt - 1)) * 0.5)

def process_single(item):
    # item: dict with keys needed
    kv_key = item['kv_key']
    payload = item['payload']
    headers = item['headers']
    put_url = item['put_url']
    skip_existing = item['skip_existing']
    retries = item['retries']
    use_wrangler = item.get('use_wrangler', False)
    wrangler_ns = item.get('wrangler_ns')
    # wrangler path
    if use_wrangler:
        # check existing
        if skip_existing:
            rc = wrangler_get(wrangler_ns, kv_key.replace('census_mesh_2020:', ''), max_retries=retries)
            if rc is None:
                return (kv_key, False, 'wrangler GET failed or wrangler not found')
            if rc == 0:
                return (kv_key, 'skipped', 'exists')
        ok = wrangler_put(wrangler_ns, kv_key.replace('census_mesh_2020:', ''), payload, max_retries=retries)
        if ok:
            return (kv_key, True, '')
        return (kv_key, False, 'wrangler PUT failed')
    # existing HTTP path
    # GET if skip_existing
    if skip_existing:
        resp = request_with_retry('GET', put_url, headers=headers, max_retries=retries)
        if resp is None:
            return (kv_key, False, f'GET failed (no response)')
        if resp.status_code == 200:
            return (kv_key, 'skipped', 'exists')
        if resp.status_code != 404:
            return (kv_key, False, f'GET status {resp.status_code} body={resp.text[:200]}')
    # PUT
    resp = request_with_retry('PUT', put_url, headers={**headers, 'Content-Type': 'application/json'}, data=payload, max_retries=retries)
    if resp is None:
        return (kv_key, False, 'PUT failed (no response)')
    if 200 <= resp.status_code < 300:
        return (kv_key, True, '')
    return (kv_key, False, f'PUT status {resp.status_code} body={resp.text[:200]}')

def main():
    p = argparse.ArgumentParser(description='Upload CSV rows to Cloudflare Workers KV as JSON.')
    p.add_argument('--indir', default='census_mesh_2020_data', help='input directory with CSV files')
    p.add_argument('--skip-existing', action='store_true', help='skip keys that already exist in KV')
    p.add_argument('--dry-run', action='store_true', help="don't PUT; just show planned actions")
    p.add_argument('--batch-size', type=int, default=100)
    p.add_argument('--sleep', type=float, default=0.5, help='sleep seconds between batches')
    p.add_argument('--retries', type=int, default=3, help='retry count for HTTP operations')
    p.add_argument('--to-array-htksaki', action='store_true', help='split HTKSAKI by ; into array')
    p.add_argument('--parallel', type=int, default=0, help='number of worker threads (0 = sequential)')
    p.add_argument('--log-file', help='append logs to file')
    p.add_argument('--checkpoint-file', default='.upload_kv.checkpoint', help='checkpoint file for resume')
    p.add_argument('--checkpoint-every', type=int, default=100, help='write checkpoint every N processed rows')
    p.add_argument('--progress-every', type=int, default=100, help='print progress every N processed rows')
    p.add_argument('--upload-batch-size', type=int, default=1000, help='number of uploads to group per batch')
    p.add_argument('--only-json', action='store_true', help='do not contact Cloudflare; write per-row JSON files to --outdir')
    p.add_argument('--outdir', default='out_json', help='output directory for --only-json mode')
    p.add_argument('--use-wrangler', action='store_true', help='use wrangler cli instead of direct HTTP API')
    p.add_argument('--wrangler-namespace', help='wrangler namespace id (defaults to CF_NAMESPACE_ID env)')
    args = p.parse_args()

    # prepare outdir for only-json mode
    if args.only_json:
        try:
            os.makedirs(args.outdir, exist_ok=True)
        except Exception as e:
            print(f"ERROR: cannot create outdir {args.outdir}: {e}", file=sys.stderr)
            sys.exit(1)

    # wrangler namespace resolution (available for both modes)
    wrangler_ns = args.wrangler_namespace or os.environ.get('CF_NAMESPACE_ID')

    # If using wrangler, skip requiring CF_ACCOUNT_ID / CF_API_TOKEN
    if args.use_wrangler:
        if not wrangler_ns:
            print("ERROR: --use-wrangler specified but no wrangler namespace provided (use --wrangler-namespace or set CF_NAMESPACE_ID)", file=sys.stderr)
            sys.exit(1)
        # ensure wrangler CLI is available to avoid subprocess hangs
        if shutil.which('wrangler') is None:
            # if CF_* env vars are available, fall back to HTTP API instead of exiting
            env_account = os.environ.get('CF_ACCOUNT_ID')
            env_ns = os.environ.get('CF_NAMESPACE_ID')
            env_token = os.environ.get('CF_API_TOKEN')
            if env_account and env_ns and env_token:
                print("WARNING: wrangler CLI not found; falling back to HTTP API using CF_* environment variables", file=sys.stderr)
                # switch to HTTP path
                args.use_wrangler = False
                account_id = env_account
                namespace_id = env_ns
                api_token = env_token
                headers = {'Authorization': f'Bearer {api_token}'}
                put_url_base = f'https://api.cloudflare.com/client/v4/accounts/{account_id}/storage/kv/namespaces/{namespace_id}/values/'
            else:
                print("ERROR: wrangler CLI not found in PATH. Install via: npm install -g wrangler, or set CF_ACCOUNT_ID/CF_NAMESPACE_ID/CF_API_TOKEN to use HTTP API", file=sys.stderr)
                sys.exit(1)
        else:
            account_id = None
            namespace_id = None
            api_token = None
            headers = {}
            put_url_base = None
    else:
        account_id = os.environ.get('CF_ACCOUNT_ID')
        namespace_id = os.environ.get('CF_NAMESPACE_ID')
        api_token = os.environ.get('CF_API_TOKEN')
        if not (account_id and namespace_id and api_token):
            print("ERROR: CF_ACCOUNT_ID, CF_NAMESPACE_ID, CF_API_TOKEN must be set (or use --use-wrangler)", file=sys.stderr)
            sys.exit(1)
        headers = {'Authorization': f'Bearer {api_token}'}
        put_url_base = f'https://api.cloudflare.com/client/v4/accounts/{account_id}/storage/kv/namespaces/{namespace_id}/values/'

    csv_paths = sorted(glob.glob(os.path.join(args.indir, '*')))
    # load checkpoint
    chk = load_checkpoint(args.checkpoint_file)
    resume_file = None
    resume_index = 0
    if chk:
        resume_file = chk.get('file')
        resume_index = chk.get('index', 0)

    total = 0
    success = 0
    skipped = 0
    failed = 0
    failures = []

    processed_since_checkpoint = 0
    processed_total = 0

    def log(msg):
        print(msg)
        if args.log_file:
            with open(args.log_file, 'a', encoding='utf-8') as lf:
                lf.write(msg + '\n')

    for path in csv_paths:
        # handle resume skipping files
        if resume_file and os.path.abspath(path) < os.path.abspath(resume_file):
            continue
        try:
            fieldnames, rows, used_enc = read_csv_stream(path)
        except Exception as e:
            log(f"Failed to read {path}: {e}")
            continue
        key_field = find_key_field(fieldnames)

        start_idx = 0
        if resume_file and os.path.abspath(path) == os.path.abspath(resume_file):
            start_idx = resume_index

        # sequential processing
        if args.parallel and args.parallel > 0:
            # process rows and execute upload batches as we read to avoid large memory use
            batch = []
            last_processed_idx = None
            for idx, row in enumerate(rows):
                if idx < start_idx:
                    continue
                total += 1
                json_obj = process_row_to_json(fieldnames, row, to_array_htksaki=args.to_array_htksaki)
                key_raw = row.get(key_field)
                key_clean = clean_raw_value(key_raw)
                if key_clean is None:
                    failed += 1
                    failures.append((None, "missing key_code"))
                    continue
                # safe filename base from key_clean
                safe_name = re.sub(r'[^0-9A-Za-z._-]', '_', str(key_clean))
                if args.only_json:
                    out_path = os.path.join(args.outdir, f"{safe_name}.json")
                    try:
                        with open(out_path, 'w', encoding='utf-8') as of:
                            json.dump(json_obj, of, ensure_ascii=False)
                        success += 1
                    except Exception as e:
                        failed += 1
                        failures.append((key_clean, f"write failed: {e}"))
                    continue
                kv_key = KV_KEY_PREFIX + str(key_clean)
                payload = json.dumps(json_obj, ensure_ascii=False).encode('utf-8')
                if len(payload) > SIZE_WARNING_BYTES:
                    log(f"WARNING: value for {kv_key} is {len(payload)} bytes (> {SIZE_WARNING_BYTES})")
                if args.dry_run:
                    log(f"[DRY RUN] PUT {kv_key}")
                    log(f"[DRY RUN] SAMPLE JSON: {json.dumps(json_obj, ensure_ascii=False)[:1000]}")
                    success += 1
                    continue
                put_url = put_url_base + requests.utils.requote_uri(kv_key)
                batch.append({
                    'kv_key': kv_key,
                    'payload': payload,
                    'headers': headers,
                    'put_url': put_url,
                    'skip_existing': args.skip_existing,
                    'retries': args.retries,
                    'use_wrangler': args.use_wrangler,
                    'wrangler_ns': wrangler_ns,
                    'row_index': idx,
                })

                # if batch is full, execute it
                if args.upload_batch_size and len(batch) >= args.upload_batch_size:
                    last_processed_idx = None
                    with ThreadPoolExecutor(max_workers=args.parallel) as ex:
                        futures = {ex.submit(process_single, t): t for t in batch}
                        for fut in as_completed(futures):
                            t = futures[fut]
                            kv_key, ok_flag, msg = fut.result()
                            if ok_flag is True:
                                success += 1
                            elif ok_flag == 'skipped':
                                skipped += 1
                            else:
                                failed += 1
                                failures.append((kv_key, msg))
                            processed_since_checkpoint += 1
                            processed_total += 1
                            try:
                                last_processed_idx = max(last_processed_idx, t.get('row_index')) if last_processed_idx is not None else t.get('row_index')
                            except Exception:
                                pass
                            if args.progress_every and processed_total % args.progress_every == 0:
                                log(f"Progress: processed={processed_total} total={total} success={success} skipped={skipped} failed={failed}")
                            if processed_since_checkpoint >= args.checkpoint_every:
                                save_checkpoint(args.checkpoint_file, {'file': os.path.abspath(path), 'index': (last_processed_idx + 1) if last_processed_idx is not None else 0})
                                processed_since_checkpoint = 0
                    if last_processed_idx is not None:
                        save_checkpoint(args.checkpoint_file, {'file': os.path.abspath(path), 'index': last_processed_idx + 1})
                    log(f"Completed upload batch for file {os.path.basename(path)}: items {idx - len(batch) + 1}-{idx+1}")
                    if args.sleep and args.sleep > 0:
                        time.sleep(args.sleep)
                    batch = []

            # flush remaining batch
            if batch:
                last_processed_idx = None
                with ThreadPoolExecutor(max_workers=args.parallel) as ex:
                    futures = {ex.submit(process_single, t): t for t in batch}
                    for fut in as_completed(futures):
                        t = futures[fut]
                        kv_key, ok_flag, msg = fut.result()
                        if ok_flag is True:
                            success += 1
                        elif ok_flag == 'skipped':
                            skipped += 1
                        else:
                            failed += 1
                            failures.append((kv_key, msg))
                        processed_since_checkpoint += 1
                        processed_total += 1
                        try:
                            last_processed_idx = max(last_processed_idx, t.get('row_index')) if last_processed_idx is not None else t.get('row_index')
                        except Exception:
                            pass
                        if args.progress_every and processed_total % args.progress_every == 0:
                            log(f"Progress: processed={processed_total} total={total} success={success} skipped={skipped} failed={failed}")
                        if processed_since_checkpoint >= args.checkpoint_every:
                            save_checkpoint(args.checkpoint_file, {'file': os.path.abspath(path), 'index': (last_processed_idx + 1) if last_processed_idx is not None else 0})
                            processed_since_checkpoint = 0
                if last_processed_idx is not None:
                    save_checkpoint(args.checkpoint_file, {'file': os.path.abspath(path), 'index': last_processed_idx + 1})
                log(f"Completed final upload batch for file {os.path.basename(path)}: items end")
            # after file done, update checkpoint to next file start
            # we don't know total rows without pre-reading; set checkpoint to last processed index if available
            try:
                last_idx = last_processed_idx
            except NameError:
                last_idx = None
            save_checkpoint(args.checkpoint_file, {'file': os.path.abspath(path), 'index': (last_idx + 1) if last_idx is not None else 0})
        else:
            # sequential per row
            for idx, row in enumerate(rows):
                if idx < start_idx:
                    continue
                total += 1
                json_obj = process_row_to_json(fieldnames, row, to_array_htksaki=args.to_array_htksaki)
                key_raw = row.get(key_field)
                key_clean = clean_raw_value(key_raw)
                if key_clean is None:
                    failed += 1
                    failures.append((None, "missing key_code"))
                    continue
                safe_name = re.sub(r'[^0-9A-Za-z._-]', '_', str(key_clean))
                if args.only_json:
                    out_path = os.path.join(args.outdir, f"{safe_name}.json")
                    try:
                        with open(out_path, 'w', encoding='utf-8') as of:
                            json.dump(json_obj, of, ensure_ascii=False)
                        success += 1
                    except Exception as e:
                        failed += 1
                        failures.append((key_clean, f"write failed: {e}"))
                    continue
                kv_key = KV_KEY_PREFIX + str(key_clean)
                payload = json.dumps(json_obj, ensure_ascii=False).encode('utf-8')
                if len(payload) > SIZE_WARNING_BYTES:
                    log(f"WARNING: value for {kv_key} is {len(payload)} bytes (> {SIZE_WARNING_BYTES})")
                if args.dry_run:
                    log(f"[DRY RUN] PUT {kv_key}")
                    log(f"[DRY RUN] SAMPLE JSON: {json.dumps(json_obj, ensure_ascii=False)[:1000]}")
                    success += 1
                    continue

                # wrangler path (sequential)
                if args.use_wrangler:
                    # check existing
                    if args.skip_existing:
                        rc = wrangler_get(wrangler_ns, str(key_clean), max_retries=args.retries)
                        if rc is None:
                            failed += 1
                            failures.append((kv_key, 'wrangler GET failed or wrangler not found'))
                            continue
                        if rc == 0:
                            skipped += 1
                            continue
                    ok = wrangler_put(wrangler_ns, str(key_clean), payload, max_retries=args.retries)
                    if ok:
                        success += 1
                    else:
                        failed += 1
                        failures.append((kv_key, 'wrangler PUT failed'))
                    processed_since_checkpoint += 1
                    if processed_since_checkpoint >= args.checkpoint_every:
                        save_checkpoint(args.checkpoint_file, {'file': os.path.abspath(path), 'index': idx+1})
                        processed_since_checkpoint = 0
                    continue

                # existing HTTP path
                if args.skip_existing:
                    get_url = put_url_base + requests.utils.requote_uri(kv_key)
                    resp = request_with_retry('GET', get_url, headers=headers, max_retries=args.retries)
                    if resp is None:
                        failed += 1
                        failures.append((kv_key, 'GET failed (no response)'))
                        continue
                    if resp.status_code == 200:
                        skipped += 1
                        continue
                    if resp.status_code != 404:
                        failed += 1
                        failures.append((kv_key, f'GET status {resp.status_code} body={resp.text[:200]}'))
                        continue
                put_url = put_url_base + requests.utils.requote_uri(kv_key)
                resp = request_with_retry('PUT', put_url, headers={**headers, 'Content-Type': 'application/json'}, data=payload, max_retries=args.retries)
                if resp is None:
                    failed += 1
                    failures.append((kv_key, 'PUT failed (no response)'))
                elif 200 <= resp.status_code < 300:
                    success += 1
                else:
                    failed += 1
                    failures.append((kv_key, f'PUT status {resp.status_code} body={resp.text[:200]}'))
                processed_since_checkpoint += 1
                processed_total += 1
                if args.progress_every and processed_total % args.progress_every == 0:
                    log(f"Progress: processed={processed_total} total={total} success={success} skipped={skipped} failed={failed}")
                if processed_since_checkpoint >= args.checkpoint_every:
                    save_checkpoint(args.checkpoint_file, {'file': os.path.abspath(path), 'index': idx+1})
                    processed_since_checkpoint = 0
                # if we've reached an upload batch boundary, log and sleep
                if args.upload_batch_size and processed_total % args.upload_batch_size == 0:
                    log(f"Completed upload batch: processed_total={processed_total}")
                    if args.sleep and args.sleep > 0:
                        time.sleep(args.sleep)

    # summary
    log("Done.")
    log(f"Total processed: {total}")
    log(f"Success: {success}")
    log(f"Skipped: {skipped}")
    log(f"Failed: {failed}")
    if failures:
        log("Failures (sample up to 20):")
        for k, msg in failures[:20]:
            log(f"- {k}: {msg}")

if __name__ == '__main__':
    main()
