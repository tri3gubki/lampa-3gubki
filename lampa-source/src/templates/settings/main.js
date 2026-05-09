let html = `<div>
    <div class="settings-folder selector" data-component="interface">
        <div class="settings-folder__icon">
            <svg width="37" height="37" viewBox="0 0 37 37" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path fill-rule="evenodd" clip-rule="evenodd" d="M17.3222 3.76511C17.3222 1.7586 15.6937 0.130127 13.6872 0.130127H3.99387C1.98736 0.130127 0.358887 1.7586 0.358887 3.76511V18.3051C0.358887 20.3116 1.98736 21.94 3.99387 21.94H13.6872C15.6937 21.94 17.3222 20.3116 17.3222 18.3051V3.76511ZM14.8988 3.76511V18.3051C14.8988 18.9739 14.356 19.5167 13.6872 19.5167H3.99387C3.32503 19.5167 2.78221 18.9739 2.78221 18.3051V3.76511C2.78221 3.09628 3.32503 2.55345 3.99387 2.55345H13.6872C14.356 2.55345 14.8988 3.09628 14.8988 3.76511ZM17.3222 27.9983C17.3222 25.9918 15.6937 24.3634 13.6872 24.3634H3.99387C1.98736 24.3634 0.358887 25.9918 0.358887 27.9983V32.845C0.358887 34.8515 1.98736 36.48 3.99387 36.48H13.6872C15.6937 36.48 17.3222 34.8515 17.3222 32.845V27.9983ZM14.8988 27.9983V32.845C14.8988 33.5138 14.356 34.0567 13.6872 34.0567H3.99387C3.32503 34.0567 2.78221 33.5138 2.78221 32.845V27.9983C2.78221 27.3295 3.32503 26.7867 3.99387 26.7867H13.6872C14.356 26.7867 14.8988 27.3295 14.8988 27.9983ZM36.7087 3.76511C36.7087 2.80105 36.3258 1.87648 35.6441 1.19479C34.9624 0.513098 34.0378 0.130127 33.0738 0.130127H23.3805C22.4164 0.130127 21.4918 0.513098 20.8101 1.19479C20.1284 1.87648 19.7455 2.80105 19.7455 3.76511V32.845C19.7455 33.8091 20.1284 34.7336 20.8101 35.4153C21.4918 36.097 22.4164 36.48 23.3805 36.48H33.0738C34.0378 36.48 34.9624 36.097 35.6441 35.4153C36.3258 34.7336 36.7087 33.8091 36.7087 32.845V3.76511ZM34.2854 3.76511V32.845C34.2854 33.5138 33.7426 34.0567 33.0738 34.0567H23.3805C22.7116 34.0567 22.1688 33.5138 22.1688 32.845V3.76511C22.1688 3.09628 22.7116 2.55345 23.3805 2.55345H33.0738C33.7426 2.55345 34.2854 3.09628 34.2854 3.76511Z" fill="white"/>
            </svg>
        </div>
        <div class="settings-folder__name">#{settings_main_interface}</div>
    </div>
    <div class="settings-folder selector" data-component="player">
        <div class="settings-folder__icon">
            <img src="./img/icons/settings/player.svg" />
        </div>
        <div class="settings-folder__name">#{settings_main_player}</div>
    </div>
    <div class="settings-folder selector" data-component="parser">
        <div class="settings-folder__icon">
            <img src="./img/icons/settings/parser.svg" />
        </div>
        <div class="settings-folder__name">#{settings_main_parser}</div>
    </div>
    <div class="settings-folder selector" data-component="server">
        <div class="settings-folder__icon">
            <img src="./img/icons/settings/server.svg" />
        </div>
        <div class="settings-folder__name">#{settings_main_torrserver}</div>
    </div>
    <div class="settings-folder selector" data-component="tmdb">
        <div class="settings-folder__icon">
            <svg xmlns="http://www.w3.org/2000/svg" height="32" viewBox="0 0 32 32">
                <path fill="white" d="M25.99 29.198c2.807 0 4.708-1.896 4.708-4.708v-19.781c0-2.807-1.901-4.708-4.708-4.708h-19.979c-2.807 0-4.708 1.901-4.708 4.708v27.292l2.411-2.802v-24.49c0.005-1.266 1.031-2.292 2.297-2.292h19.974c1.266 0 2.292 1.026 2.292 2.292v19.781c0 1.266-1.026 2.292-2.292 2.292h-16.755l-2.417 2.417-0.016-0.016zM11.714 15.286h-2.26v7.599h2.26c5.057 0 5.057-7.599 0-7.599zM11.714 21.365h-0.734v-4.557h0.734c2.958 0 2.958 4.557 0 4.557zM11.276 13.854h1.516v-6.083h1.891v-1.505h-5.302v1.505h1.896zM18.75 9.599l-2.625-3.333h-0.49v7.714h1.542v-4.24l1.573 2.042 1.578-2.042-0.010 4.24h1.542v-7.714h-0.479zM21.313 19.089c0.474-0.333 0.677-0.922 0.698-1.5 0.031-1.339-0.807-2.307-2.156-2.307h-3.005v7.609h3.005c1.24-0.010 2.245-1.021 2.245-2.26v-0.036c0-0.62-0.307-1.172-0.781-1.5zM18.37 16.802h1.354c0.432 0 0.698 0.339 0.698 0.766 0.031 0.406-0.286 0.76-0.698 0.76h-1.354zM19.724 21.37h-1.354v-1.516h1.37c0.411 0 0.745 0.333 0.745 0.745v0.016c0 0.417-0.333 0.755-0.75 0.755z"/>
            </svg>
        </div>
        <div class="settings-folder__name">TMDB</div>
    </div>
    <div class="settings-folder selector" data-component="more">
        <div class="settings-folder__icon">
            <img src="./img/icons/settings/more.svg" />
        </div>
        <div class="settings-folder__name">#{settings_main_rest}</div>
    </div>
</div>`

export default html
