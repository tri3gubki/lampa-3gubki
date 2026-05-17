let html = `<div>
    <div class="settings-param selector" data-type="input" data-name="prowlarr_url" placeholder="#{settings_parser_jackett_placeholder}">
        <div class="settings-param__name">#{settings_parser_jackett_link}</div>
        <div class="settings-param__value"></div>
        <div class="settings-param__descr">#{settings_parser_prowlarr_link_descr}</div>
    </div>

    <div class="settings-param selector" data-type="input" data-name="prowlarr_key" data-string="true" placeholder="#{settings_parser_jackett_key_placeholder}">
        <div class="settings-param__name">#{settings_parser_jackett_key}</div>
        <div class="settings-param__value"></div>
        <div class="settings-param__descr">#{settings_parser_prowlarr_key_descr}</div>
    </div>

    <div class="settings-param selector" data-type="toggle" data-name="parse_timeout">
        <div class="settings-param__name">#{settings_parser_timeout_title}</div>
        <div class="settings-param__value"></div>
        <div class="settings-param__descr">#{settings_parser_timeout_descr}</div>
    </div>
</div>`

export default html
