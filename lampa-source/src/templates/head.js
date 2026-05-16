let html = `<div class="head">
    <div class="head__body">
        <div class="head__logo-icon">
            <img src="./img/logo-icon.svg" />
        </div>

        <div class="head__menu-icon">
            <svg><use xlink:href="#sprite-menu"></use></svg>
        </div>

        <div class="head__title"></div>
        
        <div class="head__actions">
            <div class="head__action selector open--search">
                <svg><use xlink:href="#sprite-search"></use></svg>
            </div>

            <div class="head__action selector open--catalog">
                <svg><use xlink:href="#sprite-catalog"></use></svg>
            </div>

            <div class="head__action selector open--settings">
                <svg><use xlink:href="#sprite-settings"></use></svg>
            </div>

            <div class="head__action selector open--exit">
                <svg><use xlink:href="#sprite-exit"></use></svg>
            </div>

            <div class="head__action selector hide full--screen">
                <svg><use xlink:href="#sprite-fullscreen"></use></svg>
            </div>
        </div>

        <div class="head__time">
            <div class="head__time-now time--clock"></div>
            <div>
                <div class="head__time-date time--full"></div>
                <div class="head__time-week time--week"></div>
            </div>
        </div>
    </div>
</div>`

export default html