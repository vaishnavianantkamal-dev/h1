// Initialize AOS
AOS.init({
    duration: 1000,
    once: true,
    easing: 'ease-in-out'
});

// Sticky Navbar
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    navbar.classList.toggle('sticky', window.scrollY > 0);
});

// Back to Top Button
const backToTop = document.getElementById('backToTop');
window.addEventListener('scroll', () => {
    backToTop.classList.toggle('show', window.scrollY > 500);
});


$(document).ready(function () {
    $('a[data-rel^=lightcase]').lightcase({
        showSequenceInfo: false,
        maxWidth: 1200,
        maxHeight: 800
    });
});


function startTimer() {
    const countdownDate = new Date("June 15, 2025 00:00:00").getTime();
    const timer = setInterval(() => {
        const now = new Date().getTime();
        const distance = countdownDate - now;
        if (distance < 0) {
            clearInterval(timer);
            document.getElementById('clockdiv').innerHTML = '<h3>Registration Closed!</h3>';
            return;
        }
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        document.querySelector('.days').textContent = days;
        document.querySelector('.hours').textContent = hours;
        document.querySelector('.minutes').textContent = minutes;
        document.querySelector('.seconds').textContent = seconds;
    }, 1000);
}
document.addEventListener('DOMContentLoaded', startTimer);


function filterFunction(input, event) {
    const query = input.value.toLowerCase();
    const list = document.getElementById('programmeList');
    const items = list.getElementsByTagName('li');
    list.classList.add('show');
    for (let item of items) {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(query) ? 'block' : 'none';
    }
    if (event.key === 'Escape' || !query) {
        list.classList.remove('show');
    }
}


function openTab(tabName) {
    const tabContents = document.getElementsByClassName('tab-content');
    for (let i = 0; i < tabContents.length; i++) {
        tabContents[i].classList.remove('active');
    }

    const tabButtons = document.getElementsByClassName('tab-button');
    for (let i = 0; i < tabButtons.length; i++) {
        tabButtons[i].classList.remove('active');
    }

    document.getElementById(tabName).classList.add('active');
    event.currentTarget.classList.add('active');
}


document.addEventListener('DOMContentLoaded', function () {
    const firstTab = document.querySelector('.nav-tabs .nav-link.active');
    if (firstTab) {
        const targetId = firstTab.getAttribute('data-bs-target');
        const targetPane = document.querySelector(targetId);
        if (targetPane) {
            targetPane.classList.add('show', 'active');
        }
    }
});


document.addEventListener('DOMContentLoaded', function () {
    jQuery('a[data-rel^=lightcase]').lightcase({
        transition: 'fade',
        showSequenceInfo: true,
        showTitle: true,
        showCaption: true,
        maxWidth: 1200,
        maxHeight: 800,
        shrinkFactor: 0.85
    });
});