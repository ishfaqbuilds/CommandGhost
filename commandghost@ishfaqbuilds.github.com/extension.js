import GObject from 'gi://GObject';
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

const THEMES = {
    hacker: {
        bg: '#000000', fg: '#00FF00', border: '#00FF00',
        cmdBg: '#00FF00', cmdFg: '#000000',
        header: '#00FF00', shadow: '0 0 20px rgba(0, 255, 0, 0.3)'
    },
    purple: {
        bg: '#1a1a2e', fg: '#e94560', border: '#16213e',
        cmdBg: '#0f3460', cmdFg: '#e94560',
        header: '#e94560', shadow: '0 4px 12px rgba(0,0,0,0.5)'
    },
    dark: {
        bg: '#2d2d2d', fg: '#f8f8f2', border: '#444444',
        cmdBg: '#444444', cmdFg: '#f8f8f2',
        header: '#bd93f9', shadow: '0 4px 12px rgba(0,0,0,0.4)'
    },
    light: {
        bg: '#f8f8f2', fg: '#282a36', border: '#444444',
        cmdBg: '#6272a4', cmdFg: '#f8f8f2',
        header: '#44475a', shadow: '0 4px 12px rgba(0,0,0,0.2)'
    }
};

const CommandGhost = GObject.registerClass(
    class CommandGhost extends PanelMenu.Button {
        _init(settings, openPrefs) {
            super._init(0.0, 'Command Ghost', false);
            
            this._settings = settings;
            this._openPrefs = openPrefs;
            this._enabled = true;
            this._suggestionBox = null;
            
            this._buildIcon();
            this._buildMenu();
            this._setupDBus();
            this._createSuggestionBox();
            
            this._settings.connect('changed::show-emoji', () => this._buildIcon());
            this._settings.connect('changed::theme', () => this._applyTheme());
            this._settings.connect('changed::box-width', () => this._applyBoxSize());
            
            // Initialize builtin commands if empty
            this._ensureBuiltinCommands();
        }
        
        _ensureBuiltinCommands() {
            const existing = this._settings.get_strv('builtin-commands');
            if (existing.length === 0) {
                const defaults = [
                    'ls|List files in current directory|Linux',
                    'ls -la|List all files including hidden ones|Linux',
                    'cd|Change directory|Linux',
                    'pwd|Print current directory path|Linux',
                    'mkdir|Create new directory|Linux',
                    'rm|Remove file|Linux',
                    'cp|Copy file or directory|Linux',
                    'mv|Move or rename file|Linux',
                    'cat|Display file contents|Linux',
                    'grep|Search for text in files|Linux',
                    'chmod|Change file permissions|Linux',
                    'chown|Change file owner|Linux',
                    'ps|List running processes|Linux',
                    'kill|Terminate a process|Linux',
                    'df|Show disk space usage|Linux',
                    'du|Show directory size|Linux',
                    'tar|Archive files|Linux',
                    'wget|Download file from internet|Linux',
                    'curl|Transfer data from server|Linux',
                    'ssh|Connect to remote server|Linux',
                    'scp|Secure copy files|Linux',
                    'man|Show manual page|Linux',
                    'history|Show command history|Linux',
                    'echo|Print text to terminal|Linux',
                    'nano|Simple text editor|Linux',
                    'git init|Initialize git repository|Git',
                    'git clone|Copy repository from remote|Git',
                    'git status|Show changed files|Git',
                    'git add|Stage files for commit|Git',
                    'git commit|Save staged changes|Git',
                    'git push|Upload commits to remote|Git',
                    'git pull|Download changes from remote|Git',
                    'git branch|List or create branches|Git',
                    'git checkout|Switch to branch|Git',
                    'git merge|Combine branches|Git',
                    'git log|Show commit history|Git',
                    'git diff|Show file differences|Git',
                    'vim|Open file in vim editor|Vim',
                    ':w|Save file in vim|Vim',
                    ':q|Quit vim|Vim',
                    ':wq|Save and quit vim|Vim',
                    ':q!|Force quit without saving|Vim',
                    'i|Enter insert mode in vim|Vim',
                    'esc|Exit insert mode in vim|Vim',
                    'dd|Delete line in vim|Vim',
                    'yy|Copy line in vim|Vim',
                    'p|Paste in vim|Vim',
                    'u|Undo in vim|Vim',
                    'docker ps|List running containers|Docker',
                    'docker images|List docker images|Docker',
                    'docker run|Start new container|Docker',
                    'docker stop|Stop running container|Docker',
                    'docker build|Build image from Dockerfile|Docker'
                ];
                this._settings.set_strv('builtin-commands', defaults);
            }
        }
        
        _buildIcon() {
            if (this._icon) {
                this.remove_child(this._icon);
                this._icon.destroy();
            }
            
            const showEmoji = this._settings.get_boolean('show-emoji');
            
            if (showEmoji) {
                this._icon = new St.Label({
                    text: '👻',
                    style_class: 'command-ghost-panel-icon',
                    y_align: Clutter.ActorAlign.CENTER
                });
            } else {
                this._icon = new St.Icon({
                    icon_name: 'dialog-password-symbolic',
                    style_class: 'system-status-icon',
                    opacity: 0,
                    width: 0
                });
            }
            this.add_child(this._icon);
        }
        
        _buildMenu() {
            this.menu.addMenuItem(new PopupMenu.PopupMenuItem('👻 Command Ghost', {
                reactive: false
            }));
            
            this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
            
            this._toggleItem = new PopupMenu.PopupSwitchMenuItem('Ghost Active', this._enabled);
            this._toggleItem.connect('toggled', (item, state) => {
                this._enabled = state;
                if (!this._enabled) {
                    this._hideSuggestions();
                }
                this._updateIconState();
            });
            this.menu.addMenuItem(this._toggleItem);
            
            this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
            
            const settingsItem = new PopupMenu.PopupMenuItem('⚙️ Settings');
            settingsItem.connect('activate', () => {
                this._openPrefs();
            });
            this.menu.addMenuItem(settingsItem);
        }
        
        _updateIconState() {
            if (this._icon) {
                this._icon.opacity = this._enabled ? 255 : 128;
            }
        }
        
        _setupDBus() {
            const iface = `
                <node>
                    <interface name="ishfaqbuilds.command.Ghost">
                        <method name="ShowSuggestions"><arg type="s" name="input" direction="in"/></method>
                        <method name="HideSuggestions"/>
                        <method name="IsEnabled"><arg type="b" name="enabled" direction="out"/></method>
                    </interface>
                </node>
            `;
            
            this._dbusImpl = Gio.DBusExportedObject.wrapJSObject(iface, this);
            this._dbusImpl.export(Gio.DBus.session, '/ishfaqbuilds/command/Ghost');
            
            Gio.DBus.session.own_name('ishfaqbuilds.command.Ghost', Gio.BusNameOwnerFlags.NONE, null, null);
        }
        
        IsEnabled() {
            return this._enabled;
        }
        
        _applyTheme() {}
        
        _applyBoxSize() {
            if (this._suggestionBox) {
                const width = this._settings.get_int('box-width');
                this._suggestionBox.style = `max-width: ${width}px;`;
            }
        }
        
        ShowSuggestions(input) {
            if (!this._enabled) {
                this._hideSuggestions();
                return;
            }
            
            if (!input || input.trim() === '') {
                this._hideSuggestions();
                return;
            }
            
            const suggestions = this._getSuggestions(input);
            if (suggestions.length > 0) {
                this._showSuggestions(suggestions);
            } else {
                this._hideSuggestions();
            }
        }
        
        HideSuggestions() {
            this._hideSuggestions();
        }
        
        _getSuggestions(input) {
            const lowerInput = input.toLowerCase().trim();
            let allCmds = [];
            
            // Get builtin commands from settings (editable)
            const builtinCmds = this._settings.get_strv('builtin-commands');
            builtinCmds.forEach(str => {
                try {
                    const [cmd, desc, cat] = str.split('|');
                    if (cmd && desc) {
                        allCmds.push({ 
                            cmd: cmd.trim(), 
                            desc: desc.trim(), 
                            cat: cat ? cat.trim() : 'Linux' 
                        });
                    }
                } catch (e) {}
            });
            
            // Add personal commands
            const personalCmds = this._settings.get_strv('personal-commands');
            personalCmds.forEach(str => {
                try {
                    const [cmd, desc, cat] = str.split('|');
                    if (cmd && desc) {
                        allCmds.push({ 
                            cmd: cmd.trim(), 
                            desc: desc.trim(), 
                            cat: cat ? cat.trim() : 'Personal' 
                        });
                    }
                } catch (e) {}
            });
            
            // Search in BOTH command name AND description
            return allCmds
                .filter(c => c.cmd.toLowerCase().includes(lowerInput) || 
                           c.desc.toLowerCase().includes(lowerInput))
                .sort((a, b) => {
                    const aCmdMatch = a.cmd.toLowerCase().startsWith(lowerInput);
                    const bCmdMatch = b.cmd.toLowerCase().startsWith(lowerInput);
                    if (aCmdMatch && !bCmdMatch) return -1;
                    if (!aCmdMatch && bCmdMatch) return 1;
                    return a.cmd.length - b.cmd.length;
                })
                .slice(0, 5);
        }
        
        _createSuggestionBox() {
            const width = this._settings.get_int('box-width') || 500;
            this._suggestionBox = new St.BoxLayout({
                style_class: 'command-ghost-box',
                vertical: true,
                visible: false,
                style: `max-width: ${width}px;`
            });
            Main.layoutManager.addChrome(this._suggestionBox);
        }
        
        _showSuggestions(suggestions) {
            if (!this._enabled) {
                this._hideSuggestions();
                return;
            }
            
            const themeName = this._settings.get_string('theme') || 'hacker';
            const theme = THEMES[themeName] || THEMES.hacker;
            const width = this._settings.get_int('box-width') || 500;
            
            this._suggestionBox.remove_all_children();
            
            this._suggestionBox.style = `
                background-color: ${theme.bg};
                border: 2px solid ${theme.border};
                border-radius: 0;
                padding: 16px;
                box-shadow: ${theme.shadow};
                max-width: ${width}px;
            `;
            
            const header = new St.Label({
                text: ' 👻 Command Ghost whispers...',
                style: `color: ${theme.header}; font-weight: bold; font-family: monospace; 
                        font-size: 14px; padding-bottom: 8px; border-bottom: 1px solid ${theme.border};`
            });
            this._suggestionBox.add_child(header);
            
            suggestions.forEach(sugg => {
                const row = new St.BoxLayout({ 
                    style: 'spacing: 12px; padding: 6px 0;'
                });
                
                const cmdLabel = new St.Label({
                    text: ` ${sugg.cmd} `,
                    style: `font-family: monospace; font-weight: bold; color: ${theme.cmdFg}; 
                            background-color: ${theme.cmdBg}; padding: 4px 8px; font-size: 13px;`
                });
                
                const descLabel = new St.Label({
                    text: ` ${sugg.desc} `,
                    style: `color: ${theme.fg}; font-size: 12px; font-family: monospace;`
                });
                
                const catLabel = new St.Label({
                    text: ` ${sugg.cat} `,
                    style: `font-size: 9px; color: ${theme.bg}; background-color: ${theme.fg}; 
                            padding: 2px 6px; font-weight: bold; font-family: monospace;`
                });
                
                row.add_child(cmdLabel);
                row.add_child(descLabel);
                row.add_child(catLabel);
                this._suggestionBox.add_child(row);
            });
            
            const monitor = Main.layoutManager.primaryMonitor;
            this._suggestionBox.set_position(monitor.x + 15, monitor.y + 15);
            this._suggestionBox.visible = true;
        }
        
        _hideSuggestions() {
            if (this._suggestionBox) {
                this._suggestionBox.visible = false;
            }
        }
        
        destroy() {
            this._hideSuggestions();
            if (this._suggestionBox) {
                Main.layoutManager.removeChrome(this._suggestionBox);
                this._suggestionBox.destroy();
            }
            if (this._dbusImpl) {
                this._dbusImpl.unexport();
            }
            super.destroy();
        }
    }
);

export default class CommandGhostExtension extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._indicator = new CommandGhost(this._settings, () => this.openPreferences());
        Main.panel.addToStatusArea('command-ghost', this._indicator, 0, 'left');
    }
    
    disable() {
        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }
    }
}
