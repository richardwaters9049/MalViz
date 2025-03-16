"use client";

import { useState } from "react";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);

  // Handle file selection
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] || null;
    setFile(selectedFile);

    if (selectedFile) {
      setFileName(selectedFile.name); // Set the file name to display
    } else {
      setFileName(null); // Clear the file name if no file is selected
    }

    console.log("File selected:", selectedFile);
  };

  // Handle file upload
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file) {
      alert("Please select a file first.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      console.log("Uploading file...");
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      console.log("Server Response:", result);

      if (response.ok) {
        setMessage("File uploaded successfully!");
      } else {
        setMessage("File upload failed.");
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      setMessage("An error occurred.");
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-24 bg-amber-50 text-black">
      <h1 className="text-2xl font-bold">Upload Potential Malware</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-6">
        <label className="cursor-pointer bg-gray-200 text-gray-800 py-2 px-4 rounded-lg inline-block">
          Select a file
          <input type="file" onChange={handleFileChange} className="hidden" />
        </label>

        {/* Display the selected file name */}
        {fileName && (
          <p className="mt-2 text-gray-800">Selected file: {fileName}</p>
        )}

        <button
          type="submit"
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded cursor-pointer"
        >
          Submit
        </button>
      </form>

      {message && <p className="mt-4">{message}</p>}
    </main>
  );
}
