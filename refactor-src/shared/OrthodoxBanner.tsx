/* Orthodox Metrics Banner Styles */

/* Base styling */
.om-header * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

.om-header {
    font-family: 'Noto Serif', serif;
    background: white;
    width: 100%;
    padding: 20px;
    border-bottom: 1px solid #e0e0e0;
}

.banner-container {
    background: white;
    padding: 20px;
    border-radius: 10px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    max-width: 800px;
    width: 100%;
    margin: 0 auto;
}

.main-content {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 40px;
    margin-bottom: 15px;
    flex-wrap: wrap;
}

/* Orthodox Three-Bar Cross */
.orthodox-cross {
    position: relative;
    width: 80px;
    height: 120px;
    filter: drop-shadow(0 0 10px rgba(255, 215, 0, 0.5));
}

.cross-bar {
    background: #FFD700;
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
}

/* Vertical beam */
.vertical-beam {
    width: 12px;
    height: 120px;
    top: 0;
}

/* Top bar (INRI bar) */
.top-bar {
    width: 30px;
    height: 8px;
    top: 20px;
}

/* Main crossbar */
.main-bar {
    width: 70px;
    height: 10px;
    top: 45px;
}

/* Bottom slanted bar */
.bottom-bar {
    width: 50px;
    height: 8px;
    top: 80px;
    transform: translateX(-50%) rotate(-20deg);
}

/* Text styling */
.left-text {
    color: #6B46C1;
    font-size: 28px;
    font-weight: 600;
    text-align: right;
    line-height: 1.3;
}

.right-text {
    color: #6B46C1;
    font-size: 24px;
    font-weight: 600;
    min-width: 250px;
    text-align: left;
    position: relative;
    height: 60px;
}

.text-transition {
    position: absolute;
    width: 100%;
    opacity: 0;
    transition: opacity 1s ease-in-out;
}

.text-transition.active {
    opacity: 1;
}

/* Bottom tagline */
.tagline {
    text-align: center;
    color: #6B46C1;
    font-size: 20px;
    font-style: italic;
    position: relative;
    height: 30px;
    margin-top: 20px;
}

/* Admin specific customization */
.admin-subtitle {
    text-align: center;
    color: #333;
    font-size: 16px;
    margin-top: 10px;
    font-family: 'Noto Sans', sans-serif;
}

/* Responsive design */
@media (max-width: 600px) {
    .main-content {
        flex-direction: column;
        gap: 20px;
    }

    .left-text, .right-text {
        text-align: center;
        font-size: 22px;
    }

    .orthodox-cross {
        order: -1;
    }

    .tagline {
        font-size: 18px;
    }
}
