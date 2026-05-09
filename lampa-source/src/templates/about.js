let html = `<div class="about">
    <div class="overhide">
        <div class="about__contacts">
            <div>
                <small>#{about_version}</small><br>
                <span class="version_app"></span>
            </div>

            <div class="hide platform_android">
                <small>#{about_version} Android APK</small><br>
                <span class="version_android"></span>
            </div>

            <div>
                <small>Hash</small><br>
                <span>{__APP_HASH__}</span>
            </div>

            <div>
                <small>Builded</small><br>
                <span>{__APP_BUILD__}</span>
            </div>
        </div>
    </div>
</div>`

export default html
