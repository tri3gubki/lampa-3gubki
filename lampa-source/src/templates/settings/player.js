let html = `<div>
    <div class="settings-param selector is--player" data-type="select" data-name="player">
        <div class="settings-param__name">#{settings_player_type}</div>
        <div class="settings-param__value"></div>
        <div class="settings-param__descr">#{settings_player_type_descr}</div>
    </div>

    <div class="settings-param selector is--android" data-type="button" data-name="reset_player" data-static="true">
        <div class="settings-param__name">#{settings_player_reset}</div>
        <div class="settings-param__value"></div>
        <div class="settings-param__descr">#{settings_player_reset_descr}</div>
    </div>

    <div class="settings-param selector is--nw" data-type="input" data-name="player_nw_path" placeholder="" data-children="player_type">
        <div class="settings-param__name">#{settings_player_path}</div>
        <div class="settings-param__value"></div>
        <div class="settings-param__descr">#{settings_player_path_descr}</div>
    </div>

    <div data-parent="player_type" data-visible-value-in="vlc, mpc" class="hide is--nw">
        <div class="settings-param-title"><span>#{settings_player_external_header}</span></div>

        <div class="settings-param selector" data-type="toggle" data-name="player_external_fullscreen">
            <div class="settings-param__name">#{settings_player_external_fullscreen}</div>
            <div class="settings-param__value"></div>
        </div>
    </div>

    <div class="settings-param selector" data-type="toggle" data-name="playlist_next">
        <div class="settings-param__name">#{settings_player_next_episode}</div>
        <div class="settings-param__value"></div>
        <div class="settings-param__descr">#{settings_player_next_episode_descr}</div>
    </div>

    <div class="settings-param selector" data-type="select" data-name="player_timecode">
        <div class="settings-param__name">#{settings_player_timecode}</div>
        <div class="settings-param__value"></div>
        <div class="settings-param__descr">#{settings_player_timecode_descr}</div>
    </div>
</div>`

export default html
