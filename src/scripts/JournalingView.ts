import {type App, type TAbstractFile, type Vault, TFile, Notice} from "obsidian";
import {moment} from "obsidian";
import type JournalingPlugin from "../main";


// 扫描目录，生成日记汇总文件
async function scanDirectories(
    app: App,
    paths: string[],
    fileName: string,
    dateFormat: string,
    filterValue: string,
) {
    for (const path of paths) {
        // 获取汇总文件
        const targetFile = await getOrCreateJournalingFile(app.vault, path, fileName)
        if (targetFile == null) {
            continue;
        }

        // 获取所有日记文件
        const files = getDateFilesByPath(app.vault, path, dateFormat);
        if (files.length == 0) {
            continue;
        }

        // 按日期排序
        sortFiles(files, dateFormat, filterValue);

        // 写入内容
        await writeContentForAll(app, targetFile, files);

        new Notice("Journaling Finish..." + files.length);
    }
}


// 写入内容
async function writeContentForAll(app: App,
                                  targetFile: TFile,
                                  files: TFile[]) {
    try {
        // 重新生成文件
        let yearTitle = "YYYY";
        let yearMonthTitle = "YYYY-MM";
        const content = files.reduce((acc, file) => {
            // 添加年标题
            if (!file.basename.startsWith(yearTitle)) {
                yearTitle = file.basename.substring(0, 4);
                acc += `\n# ${yearTitle}`;
            }
            // 添加年月标题
            if (!file.basename.startsWith(yearMonthTitle)) {
                yearMonthTitle = file.basename.substring(0, 7);
                acc += `\n## ${yearMonthTitle}`;
            }
            // 添加每日文件
            return acc
                + '\n---\n'
                + `![[${file.path}]]\n`;
        }, "");

        await app.vault.modify(targetFile, content);
    } catch (error) {
        console.error(`Failed to write journaling file: ${targetFile.path}`, error,);
        new Notice("写入文件失败");
    }
}

// 文件按日期排序
function sortFiles(files: TFile[],
                   dateFormat: string,
                   filterValue: string) {

    if (dateFormat === "YYYY-MM-DD") {
        // 标准日期格式，直接字符串比较
        files.sort((a, b) => {
            return filterValue === "new"
                ? b.basename.localeCompare(a.basename)
                : a.basename.localeCompare(b.basename);
        });
    } else {
        // 非标准日期，解析日期比较排序
        files.sort((a, b) => {
            const dateA = moment.utc(a.basename, dateFormat, true);
            const dateB = moment.utc(b.basename, dateFormat, true);
            return filterValue === "new"
                ? dateB.diff(dateA)
                : dateA.diff(dateB);
        })
    }
}

/**
 * 获取指定路径下的所有符合日期格式的文件
 * @param vault Vault
 * @param path 路径
 * @param dateFormat 日期格式
 */
function getDateFilesByPath(vault: Vault,
                            path: string,
                            dateFormat: string): TFile[] {
    // 获取文件夹
    let folder = vault.getFolderByPath(path);
    if (!folder) {
        new Notice(`${path} is not a folder.`);
        return [];
    }
    // 获取文件夹下的所有日期文件
    let files: TFile[] = [];
    folder.children.forEach((file) => {
        if (!(file instanceof TFile)) {
            return;
        }
        if (file.extension !== "md") {
            return;
        }
        const parsedDate = moment.utc(file.basename, dateFormat, true);
        if (parsedDate.isValid()) {
            files.push(file);
        }
    })
    return files;
}

/**
 * 获取日记汇总文件（获取旧的或新建）
 * @param vault Vault
 * @param path 路径
 * @param fileName 文件名
 */
async function getOrCreateJournalingFile(vault: Vault,
                                         path: string,
                                         fileName: string) {
    const filePath: string = `${path}/${fileName}`.trim();
    const targetFile: TAbstractFile | null = vault.getAbstractFileByPath(filePath);

    if (targetFile instanceof TFile) {
        // 存在时，返回文件
        return targetFile;
    } else if (targetFile === null) {
        // 不存在时，新建文件
        try {
            return await vault.create(filePath, "");
        } catch (error) {
            console.error(`Failed to create journaling file: ${filePath}`, error);
            return null;
        }
    } else {
        console.error(`${filePath} is not a file.`);
        return null;
    }
}

export default async function journalingView(plugin: JournalingPlugin) {
    await scanDirectories(
        plugin.app,
        plugin.settings.paths.split(","),
        plugin.settings.fileName.trim(),
        plugin.settings.dateFormat.trim(),
        plugin.settings.filterValue,
    );
}
