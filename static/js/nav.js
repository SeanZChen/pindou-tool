const navItems = document.querySelectorAll('.nav-item');
const pages = document.querySelectorAll('.page');

function navigateTo(pageId) {
    navItems.forEach(item => item.classList.remove('active'));
    pages.forEach(page => page.classList.remove('active'));
    
    document.querySelector(`[data-page="${pageId}"]`).classList.add('active');
    document.getElementById(`page-${pageId}`).classList.add('active');
}

navItems.forEach(item => {
    item.addEventListener('click', () => {
        navigateTo(item.dataset.page);
    });
});