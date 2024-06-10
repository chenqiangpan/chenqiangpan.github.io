// Navigation functionality
const navVideos = document.getElementById('nav-videos');
const navArticles = document.getElementById('nav-articles');
const navDemos = document.getElementById('nav-demos');
const navAbout = document.getElementById('nav-about');
const siteTitle = document.getElementById('site-title');
const videosSection = document.getElementById('videos');
const articlesSection = document.getElementById('articles');
const demosSection = document.getElementById('demos');
const aboutSection = document.getElementById('about');
const loadMoreButton = document.getElementById('load-more-videos');

navVideos.addEventListener('click', (e) => {
    e.preventDefault();
    showSection('videos');
});

navArticles.addEventListener('click', (e) => {
    e.preventDefault();
    showSection('articles');
});

navDemos.addEventListener('click', (e) => {
    e.preventDefault();
    showSection('demos');
});

navAbout.addEventListener('click', (e) => {
    e.preventDefault();
    showSection('about');
});

siteTitle.addEventListener('click', () => {
    showSection('all');
});

function showSection(section) {
    videosSection.style.display = (section === 'videos' || section === 'all') ? 'block' : 'none';
    articlesSection.style.display = (section === 'articles' || section === 'all') ? 'block' : 'none';
    demosSection.style.display = (section === 'demos' || section === 'all') ? 'block' : 'none';
    aboutSection.style.display = (section === 'about' || section === 'all') ? 'block' : 'none';
}

// Search functionality
const searchInput = document.getElementById('search');

searchInput.addEventListener('input', () => {
    const query = searchInput.value.toLowerCase();
    filterContent(query);
});

function filterContent(query) {
    const allContent = document.querySelectorAll('.video, .article, .demo');

    allContent.forEach(content => {
        const title = content.querySelector('h3').textContent.toLowerCase();
        if (title.includes(query)) {
            content.style.display = '';
        } else {
            content.style.display = 'none';
        }
    });
}

// Load more videos functionality
let currentVideoIndex = 0;
const videosPerPage = 3; // Number of videos to show per load
const videoContainer = document.getElementById('video-container');

const videoData = [
    // Example data, replace with your actual video data
    { title: 'Shooting feeling - Doom Eternal - Hit Marker', src: 'https://www.youtube.com/embed/ezL6b_VbOQY' },
    { title: 'Shooting feeling - Doom Eternal - Body Explode VFX', src: 'https://www.youtube.com/embed/HqsFsx9Kzpo' },
    { title: 'Shooting feeling - Doom Eternal - Hit Reaction', src: 'https://www.youtube.com/embed/oO1S7AixjKM' },
    // Add more video data here...
];

function loadVideos() {
    for (let i = 0; i < videosPerPage && currentVideoIndex < videoData.length; i++, currentVideoIndex++) {
        const video = videoData[currentVideoIndex];
        const videoElement = document.createElement('div');
        videoElement.className = 'video';
        videoElement.innerHTML = `
            <h3>${video.title}</h3>
            <iframe width="100%" height="315" src="${video.src}" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
        `;
        videoContainer.appendChild(videoElement);
    }

    if (currentVideoIndex >= videoData.length) {
        loadMoreButton.style.display = 'none';
    } else {
        loadMoreButton.style.display = 'block';
    }
}

loadMoreButton.addEventListener('click', loadVideos);

// Load initial set of videos
loadVideos();
