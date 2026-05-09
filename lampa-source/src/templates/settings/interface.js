let html = `<div>
    <div class="settings-param selector" data-static="true">
        <div class="settings-param__name">#{settings_interface_lang}</div>
        <div class="settings-param__value"></div>
    </div>

    <div class="settings-param selector" data-type="select" data-name="interface_size">
        <div class="settings-param__name">#{settings_interface_size}</div>
        <div class="settings-param__value"></div>
    </div>

    <div class="settings-param selector is--tv" data-type="toggle" data-name="menu_always">
        <div class="settings-param__name">#{settings_interface_menu_always}</div>
        <div class="settings-param__value"></div>
    </div>

    <div class="settings-param-title"><span>#{settings_interface_background}</span></div>

    <div class="settings-param selector" data-type="toggle" data-name="background">
        <div class="settings-param__name">#{settings_interface_background_use}</div>
        <div class="settings-param__value"></div>
    </div>

    <div class="settings-param selector" data-type="select" data-name="background_type">
        <div class="settings-param__name">#{settings_interface_background_type}</div>
        <div class="settings-param__value"></div>
    </div>

    <div class="settings-param selector" data-type="toggle" data-name="black_style">
        <div class="settings-param__name">#{settings_interface_black_style}</div>
        <div class="settings-param__value"></div>
    </div>

    <div class="settings-param-title"><span>#{title_card}</span></div>

    <div class="settings-param selector" data-type="toggle" data-name="card_interfice_poster">
        <div class="settings-param__name">#{settings_interface_card_poster}</div>
        <div class="settings-param__value"></div>
    </div>

    <div class="settings-param selector" data-type="toggle" data-name="card_interfice_cover">
        <div class="settings-param__name">#{settings_interface_card_cover}</div>
        <div class="settings-param__value"></div>
    </div>

    <div class="settings-param-title"><span>#{settings_interface_performance}</span></div>

    <div class="settings-param selector" data-type="toggle" data-name="animation">
        <div class="settings-param__name">#{settings_interface_animation}</div>
        <div class="settings-param__value"></div>
        <div class="settings-param__descr">#{settings_interface_animation_descr}</div>
    </div>
</div>`

export default html
