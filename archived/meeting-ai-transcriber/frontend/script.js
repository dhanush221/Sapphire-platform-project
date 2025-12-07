document.getElementById("uploadBtn").addEventListener("click", async () => {
  const file = document.getElementById("audioFile").files[0];
  const formData = new FormData();
  formData.append("file", file);
  document.getElementById("output").textContent = "Uploading & processing...";

  const res = await fetch("http://localhost:8080/api/upload", { method: "POST", body: formData });
  const data = await res.json();

  document.getElementById("output").textContent =
    `🗣 Transcript:\n${data.transcript}\n\n📝 Summary:\n${data.summary}`;
});
