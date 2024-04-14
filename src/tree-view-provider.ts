import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export class NodeDependenciesProvider implements vscode.TreeDataProvider<Dependency> {
  private tree: Dependency[] = [];
  private _onDidChangeTreeData: vscode.EventEmitter<Dependency | undefined | null | void> = new vscode.EventEmitter<Dependency | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<Dependency | undefined | null | void> = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }
  
  constructor(private workspaceRoot: string) {}

  getTreeItem(element: Dependency): vscode.TreeItem {
    return element;
  }

  getChildren(element?: Dependency): Thenable<Dependency[]> {
    if (!this.workspaceRoot) {
      vscode.window.showInformationMessage('No dependency in empty workspace');
      return Promise.resolve([]);
    }

    if (element) {
      let needed = element.needed;

      if (needed.length > 0) {
        return Promise.resolve(
          needed.map((dep) => {
            return new Dependency(
              dep,
              vscode.TreeItemCollapsibleState.None,
              [],
              '',
              false
            );
          })
        );
      }
    } else {
      return Promise.resolve(this.tree);
    }
  }

  loadDependencies(components: any): void {
    for (const [key, value] of Object.entries(components.components)) {
      this.tree.push(new Dependency(
        key,
        vscode.TreeItemCollapsibleState.Collapsed,
        value.needs,
        value.type,
        false
      ));
    }
  }

}

class Dependency extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public needed: Array<string> = [],
    public explanation: string,
    puvlic explained: boolean = false
  ) {
    super(label, collapsibleState);
    this.tooltip = `${this.label}`;
    this.description = this.explanation;
  }

  iconPath = {
    light: path.join(__filename, '..', '..', 'resources', 'light', 'dependency.svg'),
    dark: path.join(__filename, '..', '..', 'resources', 'dark', 'dependency.svg')
  };
}
