document.addEventListener("nav", async () => {
  const displayElement = document.getElementById("doc-count-display")
  if (!displayElement) return
  try {
    const data = await fetchData
    const count = Object.keys(data).length
    displayElement.textContent = `已收录：${count} 个知识点 ✨`
  } catch (e) {
    console.error("Failed to load document count:", e)
    displayElement.textContent = "已收录：加载失败"
  }
})
