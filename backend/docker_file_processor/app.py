from fastapi import FastAPI, File, UploadFile
import os

# Initialize FastAPI app
app = FastAPI()

# Directory where files will be temporarily stored
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)  # Ensure the directory exists


@app.get("/")
def health_check():
    """
    Health check endpoint to confirm that the API is running.
    """
    return {"message": "✅ Malware container is ready.."}


@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """
    Endpoint to receive an uploaded file and save it to the container.

    - `file`: The uploaded file from the client.
    - Returns a JSON response confirming the file was received.
    """
    file_location = os.path.join(UPLOAD_DIR, file.filename)

    # Save the uploaded file
    with open(file_location, "wb") as buffer:
        buffer.write(await file.read())

    return {
        "message": "✅ File received successfully!",
        "filename": file.filename,
        "path": file_location,
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
