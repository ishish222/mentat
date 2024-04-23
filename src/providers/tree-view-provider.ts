import * as vscode from 'vscode';
import * as path from 'path';

export class ExplanationNodeProvider implements vscode.TreeDataProvider<ExplanationNode> {
  public tree: ExplanationNode[] = [];
  private _onDidChangeTreeData: vscode.EventEmitter<ExplanationNode | undefined | null | void> = new vscode.EventEmitter<ExplanationNode | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<ExplanationNode | undefined | null | void> = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }
  
  constructor(
    private context: vscode.ExtensionContext, 
    private workspaceRoot: string
  ) {}

  addIcon(element: ExplanationNode, contract: boolean, explained: boolean) {
    if(explained) {
      if(contract) {
        element.iconPath = {
          light: this.context.asAbsolutePath(path.join('resources', 'light', 'document-explained.svg')),
          dark: this.context.asAbsolutePath(path.join('resources', 'dark', 'document-explained.svg'))
        };
  
      }
      else{
        element.iconPath = {
          light: this.context.asAbsolutePath(path.join('resources', 'light', 'explained-icon.svg')),
          dark: this.context.asAbsolutePath(path.join('resources', 'dark', 'explained-icon.svg'))
        };  
      }
    }
    else 
    {
      if(contract) {
        element.iconPath = {
          light: this.context.asAbsolutePath(path.join('resources', 'light', 'document-unexplained.svg')),
          dark: this.context.asAbsolutePath(path.join('resources', 'dark', 'document-unexplained.svg'))
        };
      }
      else{
        element.iconPath = {
          light: this.context.asAbsolutePath(path.join('resources', 'light', 'unexplained-icon.svg')),
          dark: this.context.asAbsolutePath(path.join('resources', 'dark', 'unexplained-icon.svg'))
        };  
      }
    }
  }

  getTreeItem(element: ExplanationNode): vscode.TreeItem {
    element.command = { 
      command: 'node.select', 
      title: 'Show Explanation', 
      arguments: [element]
    };
    
    if(element instanceof ExplanationNodeContract) {
      this.addIcon(element, true, element.explained);
    }
    else {
      this.addIcon(element, false, element.explained);
    }
    
    return element;
  }

  getChildren(element?: ExplanationNode): Thenable<ExplanationNode[]> {
    if (!this.workspaceRoot) {
      vscode.window.showInformationMessage('No ExplanationNode in empty workspace');
      return Promise.resolve([]);
    }

    if (element) {
      let children = element.children;

      if (children.length > 0) {
        return Promise.resolve(children);
      }
    } else {
      return Promise.resolve(this.tree);
    }

    return Promise.resolve([]);
  }

  clearExplanationNodes() {
    this.tree = [];
  }

  loadExplanationNodes_xml(contracts: boolean, response_: Object): void {
    // first loop -> listing all components
    let components: Array = response_['response'][1]['components'];

    components.forEach((component_: Object) => {
      let component = component_['component'];

      let needs: Array<string> = component.length > 2 ? component[2]['needs'] : [];
      if(contracts) {
        var node: ExplanationNode = new ExplanationNodeContract(
          component[0]['name'],
          vscode.TreeItemCollapsibleState.Collapsed,
          [],
          needs,
          '',
          false,
          component[1]['source_code']
        );
      }
      else {
        var node: ExplanationNode = new ExplanationNode(
          component[0]['name'],
          vscode.TreeItemCollapsibleState.Collapsed,
          [],
          needs,
          '',
          false
        );
      }        
      this.tree.push(node);
      });
    
    // second loop -> linking needed components
    for (let node of this.tree) { 
      for (let need_ of node.needed) {
        let need = need_['need'];

        let needed_node = this.tree.find((element) => element.label === need);
        if(needed_node) {
         node.children.push(needed_node);
        }
      }
    }

    // third loop -> collapsible or not
    for (let node of this.tree) { 
      if (node.children.length > 0) {
        node.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
      } else {
        node.collapsibleState = vscode.TreeItemCollapsibleState.None;
      }
      //console.log('Updating icon of node:', node.label);
      if(contracts) {
        node.iconPath = {
          light: this.context.asAbsolutePath(path.join('resources', 'light', 'document-unexplained.svg')),
          dark: this.context.asAbsolutePath(path.join('resources', 'dark', 'document-unexplained.svg'))
        };
      }
      else {
        node.iconPath = {
          light: this.context.asAbsolutePath(path.join('resources', 'light', 'unexplained-icon.svg')),
          dark: this.context.asAbsolutePath(path.join('resources', 'dark', 'unexplained-icon.svg'))
        };
      }
      //console.log('Updated icon:', this.context.asAbsolutePath(path.join('resources', 'dark', 'ExplanationNode.svg')));
    }
  }

}


export class ExplanationNode extends vscode.TreeItem {
  constructor(
    public label: string,
    public collapsibleState: vscode.TreeItemCollapsibleState,
    public children: ExplanationNode[] = [],
    public needed: Array<string> = [],
    public explanation: string,
    public explained: boolean = false
  ) {
    super(label, collapsibleState);
    this.contextValue = 'explanationNode';
  }
}

export class ExplanationNodeContract extends ExplanationNode {
  constructor(
    public label: string,
    public collapsibleState: vscode.TreeItemCollapsibleState,
    public children: ExplanationNode[] = [],
    public needed: Array<string> = [],
    public explanation: string,
    public explained: boolean = false,
    public source: string
  ) {
    super(label, collapsibleState, children, needed, explanation, explained);
    this.contextValue = 'explanationNodeContract';
  }

  clearExplanationNodeContracts() {
    let temp = [];
    for (let child of this.children) {
      if (child instanceof ExplanationNodeContract) {
        temp.push(child);
      }
    }
    this.children = temp;
  }

  loadExplanationNodes_xml(response_: Object): void {
    // first loop -> listing all components
    let components: Array = response_['response'][1]['components'];

    components.forEach((component_: Object) => {
      let component = component_['component'];

      let needs: Array<string> = component.length > 2 ? component[2]['needs'] : [];
      var node: ExplanationNode = new ExplanationNode(
        component[0]['name'],
        vscode.TreeItemCollapsibleState.Collapsed,
        [],
        needs,
        '',
        false
      );
      this.children.push(node);
      //this.explained = true;
      if(this.children.length > 0) {
        this.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
      }

    });

    // second loop -> linking needed components
    for (let node of this.children) {
      for (let need_ of node.needed) {
        let need = need_['need'];

        let needed_node = this.children.find((element) => element.label === need);
        if (needed_node) {
          node.children.push(needed_node);
        }
      }
    }

    // third loop -> collapsible or not
    for (let node of this.children) {
      if (node.children.length > 0) {
        node.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
      } else {
        node.collapsibleState = vscode.TreeItemCollapsibleState.None;
      }
    }
  }
}

export function serializeNode(node: ExplanationNode, map = new Map()): any {
  // Handle circular references
  //if (map.has(node)) {
  //  return { $ref: map.get(node) };
  //}
  
  const serialized = {
    label: node.label,
    collapsibleState: node.collapsibleState,
    children: [],
    needed: node.needed,
    explanation: node.explanation,
    explained: node.explained,
    contextValue: node.contextValue,
  };

  if (node instanceof ExplanationNodeContract) {
    serialized['source'] = node.source;
  }

  map.set(node, serialized);

  // Serialize children, which might include the current node itself
  serialized.children = node.children.map(child => serializeNode(child, map));

  return serialized;
}

export function deserializeNode(serialized: any, map = new Map()): ExplanationNode {
  //if (serialized.$ref) {
  //  return map.get(serialized.$ref);
  //}

  let node;
  if (serialized.contextValue === 'explanationNodeContract') {
    node = new ExplanationNodeContract(
      serialized.label,
      serialized.collapsibleState,
      [],
      serialized.needed,
      serialized.explanation,
      serialized.explained,
      serialized.source
    );
  } else {
    node = new ExplanationNode(
      serialized.label,
      serialized.collapsibleState,
      [],
      serialized.needed,
      serialized.explanation,
      serialized.explained
    );
  }

  map.set(serialized, node);

  serialized.children.forEach((child: any) => {
    node.children.push(deserializeNode(child, map));
  });

  return node;
}
