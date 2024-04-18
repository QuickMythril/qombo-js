document.addEventListener('DOMContentLoaded', function() {
    fetchBlockHeight()
        .catch(error => {
            console.error('An error occurred in the fetch chain:', error);
        });
});

function fetchBlockHeight() {
    return fetch('/blocks/height')
        .then(response => response.text())
        .then(data => {
            document.getElementById('block-height').textContent = data;
            return data;
                    })
        .catch(error => {
            console.error('Error fetching block height:', error);
            document.getElementById('block-height').textContent = `Error: ${error}`;
        });
}
