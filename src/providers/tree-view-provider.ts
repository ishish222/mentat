import * as vscode from 'vscode';
import * as path from 'path';

export function map_children_(nodes: Array<ExplanationNode>): void {
  for (let node of nodes) { 
    for (let need_ of node.needed) {
      let need = need_['need'];

      let needed_node = nodes.find((element) => element.label === need);
      if(needed_node) {
       node.children.push(needed_node);
      }
    }
    map_children_(node.children);
  }

}

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
    
    if(element.contextValue == 'explanationNodeContract') {
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

  loadExplanationNodes_xml(response_: Object): void {
    // first loop -> listing all components
    let components: Array = response_['response'][1]['components'];

    components.forEach((component_: Object) => {
      let component = component_['component'];

      let needs: Array<string> = component.length > 2 ? component[2]['needs'] : [];
      if(true) {
        var node: ExplanationNode = new ExplanationNode(
          component[0]['name'],                           // label
          vscode.TreeItemCollapsibleState.Collapsed,      // collapsibleState
          [],                                             // children (ExplanationNode[])
          needs,                                          // needs (Array<string>)
          '',                                             // explanation
          false,                                          // explained
          this,                                           // parent (ExplanationNode|null)
          'explanationNodeContract',                      // contextValue
          undefined                                       // source
        );
      }
    
      this.tree.push(node);
    });
    
    // second loop -> linking needed components
    map_children_(this.tree);
    
    // third loop -> collapsible or not, icon 
    // this might be moved to getTreeItem
    for (let node of this.tree) { 
      if (node.children.length > 0) {
        node.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
      } else {
        node.collapsibleState = vscode.TreeItemCollapsibleState.None;
      }
      
      node.iconPath = {
        light: this.context.asAbsolutePath(path.join('resources', 'light', 'document-unexplained.svg')),
        dark: this.context.asAbsolutePath(path.join('resources', 'dark', 'document-unexplained.svg'))
      };

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
    public explained: boolean = false,
    public parent: ExplanationNode|null = null,
    public contextValue: string = 'explanationNode',
    public source: string|undefined = undefined
  ) {
    super(label, collapsibleState);
  }

  clearExplanationNodeContracts() {
    let temp = [];
    for (let child of this.children) {
      if (child.contextValue == 'explanationNodeContract') {
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
        component[0]['name'],                           // label
        vscode.TreeItemCollapsibleState.Collapsed,      // collapsibleState
        [],                                             // children (ExplanationNode[])
        needs,                                          // needs (Array<string>)
        '',                                             // explanation
        false,                                          // explained
        this,                                           // parent (ExplanationNode|null)
        'explanationNode',                              // contextValue
        undefined                                       // source
      );

      this.children.push(node);
      //this.explained = true;
      if(this.children.length > 0) {
        this.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
      }

    });

    // second loop -> linking needed components
    map_children_(this.children);

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
    source: node.source
  };

  map.set(node, serialized);

  // Serialize children, which might include the current node itself
  serialized.children = node.children.map(child => serializeNode(child, map));
  // we just use needed property and map

  return serialized;
}

export function deserializeNode(parent: ExplanationNode|null, serialized: any, map = new Map()): ExplanationNode {
  //if (serialized.$ref) {
  //  return map.get(serialized.$ref);
  //}

  let node;
  node = new ExplanationNode(
    serialized.label,
    serialized.collapsibleState,
    [],
    serialized.needed,
    serialized.explanation,
    serialized.explained,
    parent,
    serialized.contextValue,
    serialized.source
  );

  map.set(serialized, node);

  serialized.children.forEach((child: any) => {
    node.children.push(deserializeNode(serialized, child, map));
  });

  return node;
}
