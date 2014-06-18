/**
 * For usage, see https://github.com/BYU-ARCLITE/Ayamel-Examples/wiki/Improving-forms
 * @param element
 * @param dropCallback
 * @param enterCallback
 */
function bindDropArea(element, dropCallback, enterCallback) {
    element.addEventListener("dragenter", enterCallback);
    element.addEventListener("dragover", function(e) {
        e.preventDefault();
    });
    element.addEventListener("drop", function(e) {
        e.preventDefault();
        e.stopPropagation();
        if (typeof dropCallback === 'function') {
            dropCallback(e.dataTransfer.files);
        }
    });
}