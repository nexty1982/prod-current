import { TreeItem } from '@mui/x-tree-view';
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';

// assets
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

// ==============================|| UI TREEVIEW - MULTI-SELECT ||============================== //

export default function MultiSelectTreeView() {
  return (
    <SimpleTreeView slots={{ collapseIcon: ExpandMoreIcon, expandIcon: ChevronRightIcon }} multiSelect>
      <TreeItem itemId="1" label="Applications">
        <TreeItem itemId="2" label="Calendar" />
        <TreeItem itemId="3" label="Chrome" />
        <TreeItem itemId="4" label="Webstorm" />
      </TreeItem>
      <TreeItem itemId="5" label="Documents">
        <TreeItem itemId="6" label="Material-UI">
          <TreeItem itemId="7" label="src">
            <TreeItem itemId="8" label="index.js" />
            <TreeItem itemId="9" label="tree-view.js" />
          </TreeItem>
        </TreeItem>
      </TreeItem>
    </SimpleTreeView>
  );
}
