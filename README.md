### 👻 Command Ghost

Get command suggestions as you type in your terminal. Perfect for learning Linux commands!

![Version](https://img.shields.io/badge/version-1.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

---
#### ⚡ Quick Install

###### 1. Download and install
```
git clone https://github.com/ishfaqbuilds/CommandGhost.git
cp -r CommandGhost/commandghost@ishfaqbuilds.github.com ~/.local/share/gnome-shell/extensions/
```

###### 2. Compile schemas
```
cd ~/.local/share/gnome-shell/extensions/commandghost@ishfaqbuilds.github.com/schemas
glib-compile-schemas .
```

###### 3. Enable extension
```
gnome-extensions enable commandghost@ishfaqbuilds.github.com
```

###### 4. Add to Zsh
```
echo "source ~/.local/share/gnome-shell/extensions/commandghost@ishfaqbuilds.github.com/command-ghost.zsh" >> ~/.zshrc
```

###### 5. Restart (Log out & back in, or Alt+F2 → r → Enter on X11)

---
#### 📌 Features

1. Smart suggestions – Type and see commands instantly
2. Search by description – Type "copy" → find cp
3. 20+ built‑in commands – Linux, Git, Vim, Docker
4. Add your own commands – With categories
5. 4 themes – Hacker Green, Ghost Purple, Dark, Light
6. Toggle on/off – Click the 👻 icon

---
#### 🎨 Themes

| Theme         | Style            |
|---------------|------------------|
| Hacker Green  | Green on black   |
| Ghost Purple  | Purple dark      |
| Dark Mode     | Comfortable dark |
| Light Mode    | Clean light      |

---
#### ✏️ Add Custom Commands

- Click 👻 in top panel → Settings
- Go to Personal tab
- Click + Add Personal Command
- Enter: command | description | category

Example:
vagrant up | Start VM | Vagrant

---
#### 🐧 Works On

Ubuntu • Fedora • Debian • Arch • Pop!_OS • Any GNOME desktop

Needs: GNOME 42+ and Zsh

---
#### 🐛 Not Working?

###### Check if enabled
```
gnome-extensions list --enabled | grep commandghost
```

###### View logs
```
journalctl -n 20 /usr/bin/gnome-shell | grep -i ghost
```
---
#### 🤝 Contribute

Want to improve Command Ghost? Contributions welcome!

1. Fork this repository
2. Create a branch (`git checkout -b feature/your-feature`)
3. Commit changes (`git commit -m "Add feature"`)
4. Push to branch (`git push origin feature/your-feature`)
5. Open a Pull Request

Ideas:
- Add Bash/Fish shell support
- New themes
- More built-in commands
- Bug fixes

---
#### 📜 License

Licensed under the **MIT License**. See the `LICENSE` file for details. Built By IshfaqBuilds

