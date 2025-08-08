import { Plugin } from "obsidian";
import { JournalingSettingTab } from "./settings";
// import "virtual:uno.css";
import journalingView from "./scripts/JournalingView";

interface JournalingPluginSettings {
    dateFormat: string;
    paths: string;
    fileName: string;
    filterValue: string;
}

const DEFAULT_SETTINGS: Partial<JournalingPluginSettings> = {
    dateFormat: "YYYY-MM-DD",
    paths: "",
    fileName: "Journaling.md",
    filterValue: "new",
};

export default class JournalingPlugin extends Plugin {
    settings!: JournalingPluginSettings;

    async loadSettings() {
        this.settings = Object.assign(
            {},
            DEFAULT_SETTINGS,
            await this.loadData(),
        );
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    async onload() {
        await this.loadSettings();

        this.addSettingTab(new JournalingSettingTab(this.app, this));

        this.addRibbonIcon('scroll-text', '汇总日记', async () => {
            await journalingView(this);
        });
    }

    onunload() {
        console.log("unloading plugin");
    }
}
