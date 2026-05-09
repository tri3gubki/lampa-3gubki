let html = `<div class="full-start-new">

    <div class="full-start-new__body">
        <div class="full-start-new__left">
            <div class="full-start-new__poster">
                <img class="full-start-new__img full--poster" />
            </div>
        </div>

        <div class="full-start-new__right">
            <div class="full-start-new__head"></div>
            <div class="full-start-new__title">{title}</div>
            <div class="full-start-new__tagline full--tagline">{tagline}</div>
            <div class="full-start-new__rate-line">
                <div class="full-start__rate rate--tmdb"><div>{rating}</div><div class="source--name">TMDB</div></div>
                <div class="full-start__rate rate--imdb hide"><div></div><div>IMDB</div></div>
                <div class="full-start__rate rate--kp hide"><div></div><div>KP</div></div>

                <div class="full-start__pg hide"></div>
                <div class="full-start__status hide"></div>
            </div>
            <div class="full-start-new__details"></div>

            <div class="full-start-new__buttons">
                <div class="full-start__button selector button--play">
                    <svg><use xlink:href="#sprite-play"></use></svg>

                    <span>#{title_watch}</span>
                </div>

                <div class="full-start__button selector button--book">
                    <svg width="21" height="32" viewBox="0 0 21 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M2 1.5H19C19.2761 1.5 19.5 1.72386 19.5 2V27.9618C19.5 28.3756 19.0261 28.6103 18.697 28.3595L12.6212 23.7303C11.3682 22.7757 9.63183 22.7757 8.37885 23.7303L2.30302 28.3595C1.9739 28.6103 1.5 28.3756 1.5 27.9618V2C1.5 1.72386 1.72386 1.5 2 1.5Z" stroke="currentColor" stroke-width="2.5"/>
                    </svg>

                    <span>#{settings_input_links}</span>
                </div>

                <div class="full-start__button selector button--options">
                    <svg><use xlink:href="#sprite-dots"></use></svg>
                </div>
            </div>
        </div>
    </div>

    <div class="hide buttons--container">
        <div class="full-start__button view--torrent hide">
            <svg><use xlink:href="#sprite-torrent"></use></svg>

            <span>#{full_torrents}</span>
        </div>

    </div>
</div>`

export default html