import os
import shutil
import json
import time

# --- Configuration ---
BASE_PATH = "/var/www/orthodoxmetrics/prod/uploads/"
# How long to keep a record of successful jobs (7 days)
RETENTION_SECONDS = 7 * 24 * 60 * 60 

def cleanup_pipeline(church_id):
    path = os.path.join(BASE_PATH, f"om_church_{church_id}")
    dirs = {
        "uploaded": os.path.join(path, "uploaded"),
        "jobs": os.path.join(path, "jobs"),
        "failed": os.path.join(path, "failed")
    }

    print(f"--- Processing Church {church_id} ---")

    # 1. Clear Uploaded (Only if they've been there > 1 hour to avoid race conditions)
    if os.path.exists(dirs["uploaded"]):
        for filename in os.listdir(dirs["uploaded"]):
            file_path = os.path.join(dirs["uploaded"], filename)
            if time.time() - os.path.getmtime(file_path) > 3600:
                os.remove(file_path)
                print(f"Cleaned old upload: {filename}")

    # 2. Smart Job Cleanup
    if os.path.exists(dirs["jobs"]):
        for job_id in os.listdir(dirs["jobs"]):
            job_path = os.path.join(dirs["jobs"], job_id)
            manifest_path = os.path.join(job_path, "manifest.json")

            if not os.path.isdir(job_path) or not os.path.exists(manifest_path):
                continue

            try:
                with open(manifest_path, 'r') as f:
                    manifest = json.load(f)
                
                status = manifest.get("status", "").lower()
                folder_age = time.time() - os.path.getmtime(job_path)

                # CASE A: Job Succeeded and is older than retention period
                if status == "success" and folder_age > RETENTION_SECONDS:
                    shutil.rmtree(job_path)
                    print(f"Purged successful job: {job_id}")

                # CASE B: Job Failed - Move to 'failed' directory for review
                elif status == "failed":
                    dest = os.path.join(dirs["failed"], job_id)
                    if not os.path.exists(dest):
                        shutil.move(job_path, dest)
                        print(f"Moved failed job to review: {job_id}")

                # CASE C: Job is 'In Progress' but has been sitting for > 24 hours (Stuck)
                elif status == "processing" and folder_age > 86400:
                    dest = os.path.join(dirs["failed"], f"STUCK_{job_id}")
                    shutil.move(job_path, dest)
                    print(f"Moved stuck job to failed: {job_id}")

            except Exception as e:
                print(f"Error processing manifest for {job_id}: {e}")

# Main execution loop
if __name__ == "__main__":
    if os.path.exists(BASE_PATH):
        for folder in os.listdir(BASE_PATH):
            if folder.startswith("om_church_"):
                cid = folder.replace("om_church_", "")
                cleanup_pipeline(cid)
