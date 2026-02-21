#!/usr/bin/env zsh
# Command Ghost - Zsh Companion

[[ -o interactive ]] || return

GHOST_DBUS="ishfaqbuilds.command.Ghost"

ghost_check() {
    dbus-send --session --dest=org.freedesktop.DBus --type=method_call \
        --print-reply /org/freedesktop/DBus org.freedesktop.DBus.NameHasOwner \
        string:$GHOST_DBUS 2>/dev/null | grep -q "boolean true"
}

ghost_enabled() {
    dbus-send --session --dest=$GHOST_DBUS --type=method_call \
        --print-reply /ishfaqbuilds/command/Ghost $GHOST_DBUS.IsEnabled 2>/dev/null | grep -q "boolean true"
}

ghost_send() {
    local input="$1"
    # Only send if ghost is enabled
    if ! ghost_enabled; then
        return
    fi
    
    if [[ -z "$input" ]]; then
        dbus-send --session --dest=$GHOST_DBUS --type=method_call \
            /ishfaqbuilds/command/Ghost $GHOST_DBUS.HideSuggestions 2>/dev/null
    else
        dbus-send --session --dest=$GHOST_DBUS --type=method_call \
            /ishfaqbuilds/command/Ghost $GHOST_DBUS.ShowSuggestions \
            string:"$input" 2>/dev/null
    fi
}

ghost_hide() {
    dbus-send --session --dest=$GHOST_DBUS --type=method_call \
        /ishfaqbuilds/command/Ghost $GHOST_DBUS.HideSuggestions 2>/dev/null
}

if ghost_check; then
    # Only show message if ghost is enabled
    if ghost_enabled; then
        echo "[Command Ghost] 👻 Active"
    fi
    
    ghost_self_insert() {
        zle .self-insert
        ghost_send "$BUFFER"
    }
    zle -N self-insert ghost_self_insert
    
    ghost_backward_delete() {
        zle .backward-delete-char
        ghost_send "$BUFFER"
    }
    zle -N backward-delete-char ghost_backward_delete
    
    ghost_accept() {
        ghost_hide
        zle .accept-line
    }
    zle -N accept-line ghost_accept
    
    TRAPINT() {
        ghost_hide
        return $(( 128 + $1 ))
    }
fi
