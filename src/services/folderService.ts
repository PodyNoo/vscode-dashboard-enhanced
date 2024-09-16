
"use strict";

import * as vscode from 'vscode';
import BaseService from './baseService';
import { Project } from '../models';

export interface IRecentFolder {
	fsPath: string;
	name: string;
}

export default class FolderService extends BaseService {
    constructor(context: vscode.ExtensionContext) {
        super(context);
        const currentFolders = vscode.workspace.workspaceFolders;
        if (currentFolders && currentFolders.length > 0) {
            for (let folder of currentFolders) {
                this.addToRecentlyOpened(folder.uri, folder.name);
            }
        }
    }

    public getRecentlyOpened(): IRecentFolder[] {
        const recentFolders = this.context.globalState.get<IRecentFolder[]>('recentFolders', []);
        return recentFolders;
    }

    public async addToRecentlyOpened(uri: vscode.Uri, name: string): Promise<void> {
        const showRecentGroup: boolean = this.configurationSection.get('showRecentGroup');
        if (!showRecentGroup) return;
        const recentFolders = this.getRecentlyOpened();
        if (recentFolders.findIndex(folder => folder.fsPath === uri.fsPath) === -1) {
            if (await this.folderExists(uri)) {
                recentFolders.push({ fsPath: uri.fsPath, name: name });
                await this.updateRecentlyOpened(recentFolders);
            }
        }
    }

    public async updateRecentlyOpened(recentFolders: IRecentFolder[]): Promise<void> {
        await this.context.globalState.update('recentFolders', recentFolders);
    }

    public async removeProjectFromRecentlyOpened(project: Project): Promise<void> {
        const recentFolders = this.getRecentlyOpened();
        const recentFolderIndex = recentFolders.findIndex(folder => folder.fsPath.trim() === project.path.trim());
        if (recentFolderIndex > -1) {
            recentFolders.splice(recentFolderIndex, 1);
            await this.updateRecentlyOpened(recentFolders);
        }
    }

    public async openFolder(): Promise<void> {
        const result = await vscode.window.showOpenDialog({
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
            openLabel: 'Open Folder'
        });

        if (result && result.length > 0) {
            const folderUri = result[0];
            try {
                await vscode.commands.executeCommand('vscode.openFolder', folderUri);
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to open folder: ${error.message}`);
            }
        }
    }

    public async folderExists(uri: vscode.Uri): Promise<boolean> {
        try {
            const stat = await vscode.workspace.fs.stat(uri);
            return stat.type === vscode.FileType.Directory;
        } catch (error) {
            return false;
        }
    }
}