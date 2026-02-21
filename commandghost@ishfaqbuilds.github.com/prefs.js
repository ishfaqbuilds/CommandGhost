import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';
import Adw from 'gi://Adw';
import {ExtensionPreferences, gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class GhostPrefs extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        
        // Page 1: Settings
        const settingsPage = new Adw.PreferencesPage({
            title: _('Settings'),
            icon_name: 'preferences-system-symbolic'
        });
        window.add(settingsPage);
        
        // Appearance Group
        const appearGroup = new Adw.PreferencesGroup({
            title: _('Appearance'),
            description: _('Customize the ghost look')
        });
        settingsPage.add(appearGroup);
        
        // Emoji toggle
        const emojiRow = new Adw.SwitchRow({
            title: _('Show Ghost Emoji'),
            subtitle: _('Display 👻 in top panel')
        });
        settings.bind('show-emoji', emojiRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        appearGroup.add(emojiRow);
        
        // Theme
        const themeRow = new Adw.ComboRow({
            title: _('Theme'),
            model: Gtk.StringList.new([_('Hacker Green'), _('Ghost Purple'), _('Dark'), _('Light')])
        });
        const currentTheme = settings.get_string('theme') || 'hacker';
        const themeIdx = {hacker: 0, purple: 1, dark: 2, light: 3}[currentTheme] || 0;
        themeRow.selected = themeIdx;
        themeRow.connect('notify::selected', () => {
            const themes = ['hacker', 'purple', 'dark', 'light'];
            settings.set_string('theme', themes[themeRow.selected]);
        });
        appearGroup.add(themeRow);
        
        // Width
        const widthRow = new Adw.SpinRow({
            title: _('Popup Width'),
            adjustment: new Gtk.Adjustment({
                lower: 300, upper: 800, step_increment: 50,
                value: settings.get_int('box-width')
            })
        });
        settings.bind('box-width', widthRow, 'value', Gio.SettingsBindFlags.DEFAULT);
        appearGroup.add(widthRow);
        
        // Page 2: Built-in Commands
        const builtinPage = new Adw.PreferencesPage({
            title: _('Commands'),
            icon_name: 'view-list-symbolic'
        });
        window.add(builtinPage);
        
        const builtinGroup = new Adw.PreferencesGroup({
            title: _('Command Library'),
            description: _('View and edit built-in commands by category')
        });
        builtinPage.add(builtinGroup);
        
        // Category selector with edit/delete
        const catBox = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 10,
            margin_bottom: 10
        });
        
        const catDropdown = new Gtk.DropDown({
            hexpand: true
        });
        catBox.append(catDropdown);
        
        // Edit category button
        const editCatBtn = new Gtk.Button({
            icon_name: 'document-edit-symbolic',
            tooltip_text: _('Rename Category')
        });
        catBox.append(editCatBtn);
        
        // Delete category button
        const delCatBtn = new Gtk.Button({
            icon_name: 'user-trash-symbolic',
            tooltip_text: _('Delete Category')
        });
        delCatBtn.add_css_class('destructive-action');
        catBox.append(delCatBtn);
        
        builtinGroup.add(catBox);
        
        // Get categories function
        const getCategories = () => {
            const cmds = settings.get_strv('builtin-commands');
            const cats = [...new Set(cmds.map(c => {
                const parts = c.split('|');
                return parts[2] || 'Uncategorized';
            }))];
            return cats.sort();
        };
        
        // Update dropdown
        const updateCatDropdown = () => {
            const cats = getCategories();
            catDropdown.model = Gtk.StringList.new(cats);
            if (cats.length > 0) {
                catDropdown.selected = 0;
            }
        };
        
        updateCatDropdown();
        
        // New category button
        const newCatBtn = new Gtk.Button({
            label: _('+ New Category'),
            margin_bottom: 10,
            halign: Gtk.Align.START
        });
        newCatBtn.add_css_class('suggested-action');
        builtinGroup.add(newCatBtn);
        
        // Commands list
        const scroll = new Gtk.ScrolledWindow({
            min_content_height: 350,
            vexpand: true
        });
        
        const listBox = new Gtk.ListBox();
        scroll.set_child(listBox);
        builtinGroup.add(scroll);
        
        const refreshBuiltin = () => {
            // Clear list
            let child;
            while ((child = listBox.get_first_child()) !== null) {
                listBox.remove(child);
            }
            
            const cats = getCategories();
            if (cats.length === 0) {
                listBox.append(new Gtk.Label({
                    label: _('No categories. Click "+ New Category" to add one.'),
                    margin_top: 40
                }));
                return;
            }
            
            const selectedCat = cats[catDropdown.selected] || cats[0];
            const allCmds = settings.get_strv('builtin-commands');
            const cmds = allCmds.filter(c => {
                const parts = c.split('|');
                return (parts[2] || 'Uncategorized') === selectedCat;
            });
            
            cmds.forEach((cmdStr) => {
                const parts = cmdStr.split('|').map(s => s.trim());
                const row = new Adw.ActionRow({
                    title: parts[0],
                    subtitle: parts[1]
                });
                
                const box = new Gtk.Box({spacing: 6, valign: Gtk.Align.CENTER});
                
                const editBtn = new Gtk.Button({icon_name: 'document-edit-symbolic'});
                editBtn.connect('clicked', () => {
                    this._editBuiltinCommand(window, settings, cmdStr, allCmds.indexOf(cmdStr), () => {
                        refreshBuiltin();
                    });
                });
                
                const delBtn = new Gtk.Button({icon_name: 'user-trash-symbolic'});
                delBtn.add_css_class('destructive-action');
                delBtn.connect('clicked', () => {
                    const all = settings.get_strv('builtin-commands');
                    const idx = all.indexOf(cmdStr);
                    if (idx > -1) {
                        all.splice(idx, 1);
                        settings.set_strv('builtin-commands', all);
                        refreshBuiltin();
                    }
                });
                
                box.append(editBtn);
                box.append(delBtn);
                row.add_suffix(box);
                listBox.append(row);
            });
            
            // Add command button - use simple label
            const addBtn = new Gtk.Button({
                label: '+ ' + _('Add to') + ' ' + selectedCat,
                margin_top: 15,
                halign: Gtk.Align.START
            });
            addBtn.add_css_class('suggested-action');
            addBtn.connect('clicked', () => {
                this._addBuiltinCommand(window, settings, selectedCat, () => {
                    refreshBuiltin();
                });
            });
            listBox.append(addBtn);
        };
        
        catDropdown.connect('notify::selected', refreshBuiltin);
        
        // New category handler
        newCatBtn.connect('clicked', () => {
            const dialog = new Gtk.Dialog({
                title: _('New Category'),
                transient_for: window,
                modal: true,
                default_width: 300
            });
            dialog.add_button(_('Cancel'), Gtk.ResponseType.CANCEL);
            dialog.add_button(_('Add'), Gtk.ResponseType.OK);
            
            const content = dialog.get_content_area();
            content.spacing = 10;
            content.margin_top = 15;
            content.margin_start = 15;
            content.margin_end = 15;
            content.margin_bottom = 15;
            
            const entry = new Gtk.Entry({placeholder_text: _('Category name')});
            content.append(entry);
            
            dialog.connect('response', (dlg, resp) => {
                if (resp === Gtk.ResponseType.OK) {
                    const cat = entry.text.trim();
                    if (cat) {
                        const cats = getCategories();
                        if (!cats.includes(cat)) {
                            // Add a placeholder command to create category
                            const all = settings.get_strv('builtin-commands');
                            all.push(`placeholder|Placeholder command|${cat}`);
                            settings.set_strv('builtin-commands', all);
                            updateCatDropdown();
                            catDropdown.selected = getCategories().indexOf(cat);
                            refreshBuiltin();
                        }
                    }
                }
                dlg.destroy();
            });
            dialog.show();
        });
        
        // Edit category handler
        editCatBtn.connect('clicked', () => {
            const cats = getCategories();
            const oldCat = cats[catDropdown.selected];
            if (!oldCat) return;
            
            const dialog = new Gtk.Dialog({
                title: _('Rename Category'),
                transient_for: window,
                modal: true,
                default_width: 300
            });
            dialog.add_button(_('Cancel'), Gtk.ResponseType.CANCEL);
            dialog.add_button(_('Rename'), Gtk.ResponseType.OK);
            
            const content = dialog.get_content_area();
            content.spacing = 10;
            content.margin_top = 15;
            content.margin_start = 15;
            content.margin_end = 15;
            content.margin_bottom = 15;
            
            const entry = new Gtk.Entry({text: oldCat});
            content.append(entry);
            
            dialog.connect('response', (dlg, resp) => {
                if (resp === Gtk.ResponseType.OK) {
                    const newCat = entry.text.trim();
                    if (newCat && newCat !== oldCat) {
                        const all = settings.get_strv('builtin-commands');
                        const updated = all.map(cmd => {
                            const parts = cmd.split('|');
                            if ((parts[2] || 'Uncategorized') === oldCat) {
                                parts[2] = newCat;
                                return parts.join('|');
                            }
                            return cmd;
                        });
                        settings.set_strv('builtin-commands', updated);
                        updateCatDropdown();
                        catDropdown.selected = getCategories().indexOf(newCat);
                        refreshBuiltin();
                    }
                }
                dlg.destroy();
            });
            dialog.show();
        });
        
        // Delete category handler
        delCatBtn.connect('clicked', () => {
            const cats = getCategories();
            const cat = cats[catDropdown.selected];
            if (!cat) return;
            
            const dialog = new Adw.MessageDialog({
                heading: _('Delete Category?'),
                body: _('This will delete all commands in') + ' ' + cat,
                transient_for: window,
                modal: true
            });
            dialog.add_response('cancel', _('Cancel'));
            dialog.add_response('delete', _('Delete'));
            dialog.set_response_appearance('delete', Adw.ResponseAppearance.DESTRUCTIVE);
            
            dialog.connect('response', (dlg, resp) => {
                if (resp === 'delete') {
                    const all = settings.get_strv('builtin-commands');
                    const filtered = all.filter(cmd => {
                        const parts = cmd.split('|');
                        return (parts[2] || 'Uncategorized') !== cat;
                    });
                    settings.set_strv('builtin-commands', filtered);
                    updateCatDropdown();
                    refreshBuiltin();
                }
                dlg.destroy();
            });
            dialog.show();
        });
        
        refreshBuiltin();
        
        // Page 3: Personal Commands
        const personalPage = new Adw.PreferencesPage({
            title: _('Personal'),
            icon_name: 'user-bookmarks-symbolic'
        });
        window.add(personalPage);
        
        const personalGroup = new Adw.PreferencesGroup({
            title: _('Your Commands'),
            description: _('Manage your custom commands by category')
        });
        personalPage.add(personalGroup);
        
        // Category selector with edit/delete for personal
        const pCatBox = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 10,
            margin_bottom: 10
        });
        
        const pCatDropdown = new Gtk.DropDown({
            hexpand: true
        });
        pCatBox.append(pCatDropdown);
        
        // Edit personal category button
        const pEditCatBtn = new Gtk.Button({
            icon_name: 'document-edit-symbolic',
            tooltip_text: _('Rename Category')
        });
        pCatBox.append(pEditCatBtn);
        
        // Delete personal category button
        const pDelCatBtn = new Gtk.Button({
            icon_name: 'user-trash-symbolic',
            tooltip_text: _('Delete Category')
        });
        pDelCatBtn.add_css_class('destructive-action');
        pCatBox.append(pDelCatBtn);
        
        personalGroup.add(pCatBox);
        
        // Get personal categories
        const getPersonalCategories = () => {
            const cmds = settings.get_strv('personal-commands');
            if (cmds.length === 0) return [];
            const cats = [...new Set(cmds.map(c => {
                const parts = c.split('|');
                return parts[2] || 'Personal';
            }))];
            return cats.sort();
        };
        
        const updatePersonalCatDropdown = () => {
            const cats = getPersonalCategories();
            pCatDropdown.model = Gtk.StringList.new(cats);
            if (cats.length > 0) {
                pCatDropdown.selected = 0;
            }
        };
        
        updatePersonalCatDropdown();
        
        const pScroll = new Gtk.ScrolledWindow({
            min_content_height: 350,
            vexpand: true
        });
        
        const pListBox = new Gtk.ListBox();
        pScroll.set_child(pListBox);
        personalGroup.add(pScroll);
        
        const refreshPersonal = () => {
            let child;
            while ((child = pListBox.get_first_child()) !== null) {
                pListBox.remove(child);
            }
            
            const cats = getPersonalCategories();
            
            // ALWAYS show Add button at the bottom
            const addBtn = new Gtk.Button({
                label: _('+ Add Personal Command'),
                margin_top: 15,
                halign: Gtk.Align.START
            });
            addBtn.add_css_class('suggested-action');
            addBtn.connect('clicked', () => {
                const currentCat = cats[pCatDropdown.selected] || 'Personal';
                this._addPersonalCommand(window, settings, currentCat, () => {
                    refreshPersonal();
                    updatePersonalCatDropdown();
                });
            });
            
            if (cats.length === 0) {
                const emptyBox = new Gtk.Box({
                    orientation: Gtk.Orientation.VERTICAL,
                    spacing: 10,
                    margin_top: 40
                });
                
                const emptyLabel = new Gtk.Label({
                    label: _('No personal commands yet.')
                });
                emptyBox.append(emptyLabel);
                emptyBox.append(addBtn);
                
                pListBox.append(emptyBox);
                return;
            }
            
            const selectedCat = cats[pCatDropdown.selected] || cats[0];
            const allCmds = settings.get_strv('personal-commands');
            const cmds = allCmds.filter(c => {
                const parts = c.split('|');
                return (parts[2] || 'Personal') === selectedCat;
            });
            
            cmds.forEach((cmdStr) => {
                const parts = cmdStr.split('|').map(s => s.trim());
                const row = new Adw.ActionRow({
                    title: parts[0],
                    subtitle: parts[1]
                });
                
                const box = new Gtk.Box({spacing: 6, valign: Gtk.Align.CENTER});
                
                const edit = new Gtk.Button({icon_name: 'document-edit-symbolic'});
                edit.connect('clicked', () => {
                    this._editPersonalCommand(window, settings, allCmds.indexOf(cmdStr), () => {
                        refreshPersonal();
                        updatePersonalCatDropdown();
                    });
                });
                
                const del = new Gtk.Button({icon_name: 'user-trash-symbolic'});
                del.add_css_class('destructive-action');
                del.connect('clicked', () => {
                    const all = settings.get_strv('personal-commands');
                    const idx = all.indexOf(cmdStr);
                    if (idx > -1) {
                        all.splice(idx, 1);
                        settings.set_strv('personal-commands', all);
                        refreshPersonal();
                        updatePersonalCatDropdown();
                    }
                });
                
                box.append(edit);
                box.append(del);
                row.add_suffix(box);
                pListBox.append(row);
            });
            
            // Add button for this category
            const catAddBtn = new Gtk.Button({
                label: '+ ' + _('Add to') + ' ' + selectedCat,
                margin_top: 15,
                halign: Gtk.Align.START
            });
            catAddBtn.add_css_class('suggested-action');
            catAddBtn.connect('clicked', () => {
                this._addPersonalCommand(window, settings, selectedCat, () => {
                    refreshPersonal();
                    updatePersonalCatDropdown();
                });
            });
            pListBox.append(catAddBtn);
        };
        
        pCatDropdown.connect('notify::selected', refreshPersonal);
        
        // Edit personal category
        pEditCatBtn.connect('clicked', () => {
            const cats = getPersonalCategories();
            const oldCat = cats[pCatDropdown.selected];
            if (!oldCat) return;
            
            const dialog = new Gtk.Dialog({
                title: _('Rename Category'),
                transient_for: window,
                modal: true,
                default_width: 300
            });
            dialog.add_button(_('Cancel'), Gtk.ResponseType.CANCEL);
            dialog.add_button(_('Rename'), Gtk.ResponseType.OK);
            
            const content = dialog.get_content_area();
            content.spacing = 10;
            content.margin_top = 15;
            content.margin_start = 15;
            content.margin_end = 15;
            content.margin_bottom = 15;
            
            const entry = new Gtk.Entry({text: oldCat});
            content.append(entry);
            
            dialog.connect('response', (dlg, resp) => {
                if (resp === Gtk.ResponseType.OK) {
                    const newCat = entry.text.trim();
                    if (newCat && newCat !== oldCat) {
                        const all = settings.get_strv('personal-commands');
                        const updated = all.map(cmd => {
                            const parts = cmd.split('|');
                            if ((parts[2] || 'Personal') === oldCat) {
                                parts[2] = newCat;
                                return parts.join('|');
                            }
                            return cmd;
                        });
                        settings.set_strv('personal-commands', updated);
                        updatePersonalCatDropdown();
                        pCatDropdown.selected = getPersonalCategories().indexOf(newCat);
                        refreshPersonal();
                    }
                }
                dlg.destroy();
            });
            dialog.show();
        });
        
        // Delete personal category
        pDelCatBtn.connect('clicked', () => {
            const cats = getPersonalCategories();
            const cat = cats[pCatDropdown.selected];
            if (!cat) return;
            
            const dialog = new Adw.MessageDialog({
                heading: _('Delete Category?'),
                body: _('This will delete all commands in') + ' ' + cat,
                transient_for: window,
                modal: true
            });
            dialog.add_response('cancel', _('Cancel'));
            dialog.add_response('delete', _('Delete'));
            dialog.set_response_appearance('delete', Adw.ResponseAppearance.DESTRUCTIVE);
            
            dialog.connect('response', (dlg, resp) => {
                if (resp === 'delete') {
                    const all = settings.get_strv('personal-commands');
                    const filtered = all.filter(cmd => {
                        const parts = cmd.split('|');
                        return (parts[2] || 'Personal') !== cat;
                    });
                    settings.set_strv('personal-commands', filtered);
                    updatePersonalCatDropdown();
                    refreshPersonal();
                }
                dlg.destroy();
            });
            dialog.show();
        });
        
        refreshPersonal();
    }
    
    _addBuiltinCommand(window, settings, category, refreshCallback) {
        const dialog = new Gtk.Dialog({
            title: _('Add Command'),
            transient_for: window,
            modal: true,
            default_width: 400
        });
        dialog.add_button(_('Cancel'), Gtk.ResponseType.CANCEL);
        dialog.add_button(_('Add'), Gtk.ResponseType.OK);
        
        const content = dialog.get_content_area();
        content.spacing = 10;
        content.margin_top = 15;
        content.margin_start = 15;
        content.margin_end = 15;
        content.margin_bottom = 15;
        
        const cmdEntry = new Gtk.Entry({placeholder_text: _('Command')});
        const descEntry = new Gtk.Entry({placeholder_text: _('Description')});
        
        content.append(new Gtk.Label({label: _('Command:'), halign: Gtk.Align.START}));
        content.append(cmdEntry);
        content.append(new Gtk.Label({label: _('Description:'), halign: Gtk.Align.START, margin_top: 5}));
        content.append(descEntry);
        
        dialog.connect('response', (dlg, resp) => {
            if (resp === Gtk.ResponseType.OK) {
                const cmd = cmdEntry.text.trim();
                const desc = descEntry.text.trim();
                if (cmd && desc) {
                    const all = settings.get_strv('builtin-commands');
                    all.push(`${cmd}|${desc}|${category}`);
                    settings.set_strv('builtin-commands', all);
                    refreshCallback();
                }
            }
            dlg.destroy();
        });
        dialog.show();
    }
    
    _editBuiltinCommand(window, settings, cmdStr, index, refreshCallback) {
        const parts = cmdStr.split('|').map(s => s.trim());
        
        const dialog = new Gtk.Dialog({
            title: _('Edit Command'),
            transient_for: window,
            modal: true,
            default_width: 400
        });
        dialog.add_button(_('Cancel'), Gtk.ResponseType.CANCEL);
        dialog.add_button(_('Save'), Gtk.ResponseType.OK);
        
        const content = dialog.get_content_area();
        content.spacing = 10;
        content.margin_top = 15;
        content.margin_start = 15;
        content.margin_end = 15;
        content.margin_bottom = 15;
        
        const cmdEntry = new Gtk.Entry({text: parts[0]});
        const descEntry = new Gtk.Entry({text: parts[1]});
        const catEntry = new Gtk.Entry({text: parts[2] || 'Linux'});
        
        content.append(new Gtk.Label({label: _('Command:'), halign: Gtk.Align.START}));
        content.append(cmdEntry);
        content.append(new Gtk.Label({label: _('Description:'), halign: Gtk.Align.START, margin_top: 5}));
        content.append(descEntry);
        content.append(new Gtk.Label({label: _('Category:'), halign: Gtk.Align.START, margin_top: 5}));
        content.append(catEntry);
        
        dialog.connect('response', (dlg, resp) => {
            if (resp === Gtk.ResponseType.OK) {
                const cmd = cmdEntry.text.trim();
                const desc = descEntry.text.trim();
                const cat = catEntry.text.trim() || 'Linux';
                if (cmd && desc) {
                    const all = settings.get_strv('builtin-commands');
                    all[index] = `${cmd}|${desc}|${cat}`;
                    settings.set_strv('builtin-commands', all);
                    refreshCallback();
                }
            }
            dlg.destroy();
        });
        dialog.show();
    }
    
    _addPersonalCommand(window, settings, category, refreshCallback) {
        const dialog = new Gtk.Dialog({
            title: _('Add Personal Command'),
            transient_for: window,
            modal: true,
            default_width: 400
        });
        dialog.add_button(_('Cancel'), Gtk.ResponseType.CANCEL);
        dialog.add_button(_('Add'), Gtk.ResponseType.OK);
        
        const content = dialog.get_content_area();
        content.spacing = 10;
        content.margin_top = 15;
        content.margin_start = 15;
        content.margin_end = 15;
        content.margin_bottom = 15;
        
        const cmdEntry = new Gtk.Entry({placeholder_text: _('Command')});
        const descEntry = new Gtk.Entry({placeholder_text: _('Description')});
        
        content.append(new Gtk.Label({label: _('Command:'), halign: Gtk.Align.START}));
        content.append(cmdEntry);
        content.append(new Gtk.Label({label: _('Description:'), halign: Gtk.Align.START, margin_top: 5}));
        content.append(descEntry);
        
        dialog.connect('response', (dlg, resp) => {
            if (resp === Gtk.ResponseType.OK) {
                const cmd = cmdEntry.text.trim();
                const desc = descEntry.text.trim();
                if (cmd && desc) {
                    const all = settings.get_strv('personal-commands');
                    all.push(`${cmd}|${desc}|${category}`);
                    settings.set_strv('personal-commands', all);
                    refreshCallback();
                }
            }
            dlg.destroy();
        });
        dialog.show();
    }
    
    _editPersonalCommand(window, settings, index, refreshCallback) {
        const cmds = settings.get_strv('personal-commands');
        const parts = cmds[index].split('|').map(s => s.trim());
        
        const dialog = new Gtk.Dialog({
            title: _('Edit Command'),
            transient_for: window,
            modal: true,
            default_width: 400
        });
        dialog.add_button(_('Cancel'), Gtk.ResponseType.CANCEL);
        dialog.add_button(_('Save'), Gtk.ResponseType.OK);
        
        const content = dialog.get_content_area();
        content.spacing = 10;
        content.margin_top = 15;
        content.margin_start = 15;
        content.margin_end = 15;
        content.margin_bottom = 15;
        
        const cmdEntry = new Gtk.Entry({text: parts[0]});
        const descEntry = new Gtk.Entry({text: parts[1]});
        const catEntry = new Gtk.Entry({text: parts[2] || 'Personal'});
        
        content.append(new Gtk.Label({label: _('Command:'), halign: Gtk.Align.START}));
        content.append(cmdEntry);
        content.append(new Gtk.Label({label: _('Description:'), halign: Gtk.Align.START, margin_top: 5}));
        content.append(descEntry);
        content.append(new Gtk.Label({label: _('Category:'), halign: Gtk.Align.START, margin_top: 5}));
        content.append(catEntry);
        
        dialog.connect('response', (dlg, resp) => {
            if (resp === Gtk.ResponseType.OK) {
                const cmd = cmdEntry.text.trim();
                const desc = descEntry.text.trim();
                const cat = catEntry.text.trim() || 'Personal';
                if (cmd && desc) {
                    cmds[index] = `${cmd}|${desc}|${cat}`;
                    settings.set_strv('personal-commands', cmds);
                    refreshCallback();
                }
            }
            dlg.destroy();
        });
        dialog.show();
    }
}
