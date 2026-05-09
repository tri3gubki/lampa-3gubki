let html = `<div>
    <div class="settings-param-title"><span>#{settings_interface_general}</span></div>

    <div class="settings-param selector" data-static="true">
        <div class="settings-param__name">#{settings_interface_lang}</div>
        <div class="settings-param__value"></div>
    </div>

    <div class="settings-param selector" data-type="select" data-name="interface_size">
        <div class="settings-param__name">#{settings_interface_size}</div>
        <div class="settings-param__value"></div>
    </div>

    <div class="settings-param selector" data-type="select" data-name="navigation_type">
        <div class="settings-param__name">#{settings_rest_navigation}</div>
        <div class="settings-param__value"></div>
    </div>

    <div class="settings-param selector" data-type="select" data-name="keyboard_type">
        <div class="settings-param__name">#{settings_rest_keyboard}</div>
        <div class="settings-param__value"></div>
    </div>

    <div class="settings-param-title"><span>#{settings_interface_performance}</span></div>

    <div class="settings-param selector" data-type="toggle" data-name="animation">
        <div class="settings-param__name">#{settings_interface_animation}</div>
        <div class="settings-param__value"></div>
        <div class="settings-param__descr">#{settings_interface_animation_descr}</div>
    </div>

    <div class="settings-param selector" data-type="select" data-name="pages_save_total">
        <div class="settings-param__name">#{settings_rest_pages}</div>
        <div class="settings-param__value"></div>
        <div class="settings-param__descr">#{settings_rest_pages_descr}</div>
    </div>
</div>`

export default html
