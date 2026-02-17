import { TreeItem } from '@mui/x-tree-view';
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';

// assets
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

interface RTVChildrenProps {
  id: string;
  name: string;
  children?: RTVChildrenProps[];
}

const data = {
  id: 'root',
  name: 'Parent',
  children: [
    {
      id: '1',
      name: 'Child - 1'
    },
    {
      id: '3',
      name: 'Child - 3',
      children: [
        {
          id: '4',
          name: 'Child - 4'
        }
      ]
    }
  ]
};

// ==============================|| UI TREEVIEW ||============================== //

export default function RecursiveTreeView() {
  const renderTree = (nodes: RTVChildrenProps) => (
    <TreeItem key={nodes.id} itemId={nodes.id} label={nodes.name}>
      {Array.isArray(nodes.children) ? nodes.children.map((node) => renderTree(node)) : null}
    </TreeItem>
  );

  return (
    <SimpleTreeView slots={{ collapseIcon: ExpandMoreIcon, expandIcon: ChevronRightIcon }} defaultExpandedItems={['root']}>
      {renderTree(data)}
    </SimpleTreeView>
  );
}
