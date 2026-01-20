const img = document.getElementById('previewImage');

const setImage = (url) => {
    if (!img || !url) return;
    img.src = url;
};

window.electronAPI?.onImagePreview?.((url) => {
    setImage(url);
});

document.addEventListener('dblclick', () => {
    window.close();
});
