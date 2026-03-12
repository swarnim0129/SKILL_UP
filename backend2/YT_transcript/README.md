# YouTube Transcript Topics API

Lean FastAPI backend that:
- downloads a YouTube video
- transcribes it with AssemblyAI
- uses Groq to split the transcript into topic sections with timestamps
- stores the transcript result in MongoDB

## Setup

```bash
cd /Users/Sameer/Yashsmith/DataHack/YT_transcript
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## `.env`

Set these values in `YT_transcript/.env`:

```bash
ASSEMBLYAI_API_KEY=your_key
GROQ_API_KEY=your_key
MONGODB_URI=your_mongodb_uri
PORT=8000
```

If your URI starts with `mmongodb+srv://`, the app will auto-fix it to `mongodb+srv://`.

Optional:

```bash
MONGODB_DB_NAME=yt_transcript
MONGODB_COLLECTION=transcripts
GROQ_MODEL=openai/gpt-oss-120b
```

## Run

```bash
python app.py
```

or

```bash
uvicorn app:app --host 0.0.0.0 --port 8000
```

## Test

Health:

```bash
curl "http://localhost:8000/health"
```

Transcribe:

```bash
curl "http://localhost:8000/transcribe?url=https://www.youtube.com/watch?v=KUECJHlV1LE&cookies_file=/Users/Sameer/Yashsmith/DataHack/YT_transcript/www.youtube.com_cookies.txt"
```

If the video works without auth, you can omit `cookies_file`.

Fetch saved Mongo record:

```bash
curl "http://localhost:8000/transcripts/<record_id>"
```

## Stored shape

MongoDB stores:
- source URL
- AssemblyAI transcript id and metadata
- overall title and summary
- topic sections with `start_ms` / `end_ms`
- timestamps for created/updated

No local transcript text file is written.

## Notes

- Data is stored in MongoDB only; no `.txt` transcript file is created.
- `GET /transcripts/<record_id>` returns the stored document.
