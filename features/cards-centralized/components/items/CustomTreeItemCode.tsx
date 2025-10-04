
import CodeDialog from "src/components/shared/CodeDialog";


function CustomTreeItemCode() {
  return (
    <CodeDialog>
      {`
import * as React from 'react';
import { styled } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Avatar from '@mui/material/Avatar';
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';
// import { useTreeItem2, UseTreeItem2Parameters } from '@mui/x-tree-view/useTreeItem2'; // Temporarily commented for build
// Temporarily commented for build - TreeItem2 components not available
// import {
//   TreeItem2Content,
//   TreeItem2IconContainer,
//   TreeItem2GroupTransition,
//   TreeItem2Label,
//   TreeItem2Root,
//   TreeItem2Checkbox,
// } from '@mui/x-tree-view/TreeItem2';
// import { TreeItem2Icon } from '@mui/x-tree-view/TreeItem2Icon';
// import { TreeItem2Provider } from '@mui/x-tree-view/TreeItem2Provider';
            
 const BCrumb = [
{
to: '/',
title: 'Home',
},
{
title: 'CustomTreeItemView ',
},
]; 


// Temporary replacement for build - using basic div instead of TreeItem2Content
const CustomTreeItemContent = styled('div')(({ theme }) => ({
    padding: theme.spacing(0.5, 1),
  }));
  
  
  
  const CustomTreeItem = React.forwardRef(function CustomTreeItem(props: any, ref) {
  const { id, itemId, label, disabled, children, ...other } = props;
  
         // Temporarily disabled for build - useTreeItem2 hook not available
     const {
       getRootProps = () => ({}),
       getContentProps = () => ({}),
       getIconContainerProps = () => ({}),
       getCheckboxProps = () => ({}),
       getLabelProps = () => ({}),
       getGroupTransitionProps = () => ({}),
       status = {},
     } = {} as any; // = useTreeItem2({ id, itemId, children, label, disabled, rootRef: ref });
  
         return (
       <div>
         <div {...getRootProps(other)}>
           <CustomTreeItemContent {...getContentProps()}>
             <div {...getIconContainerProps()}>
               <span>🌲</span> {/* Simple icon replacement */}
             </div>
             <input type="checkbox" {...getCheckboxProps()} />
             <Box sx={{ flexGrow: 1, display: 'flex', gap: 1 }}>
               <Avatar
                 sx={(theme) => ({
                   background: theme.palette.primary.main,
                   width: 24,
                   height: 24,
                   fontSize: '0.8rem',
                 })}
               >
                 {(label )[0]}
               </Avatar>
               <span {...getLabelProps()}>{label}</span>
             </Box>
           </CustomTreeItemContent>
           {children && <div {...getGroupTransitionProps()}>{children}</div>}
         </div>
       </div>
     );
  });
  
  export default function CustomTreeItemView() {
    return (
    
  
        <Box sx={{ minHeight: 200, minWidth: 250 }}>
          <SimpleTreeView defaultExpandedItems={['3']}>
            <CustomTreeItem itemId="1" label="Amelia Hart">
              <CustomTreeItem itemId="2" label="Jane Fisher" />
            </CustomTreeItem>
            <CustomTreeItem itemId="3" label="Bailey Monroe">
              <CustomTreeItem itemId="4" label="Freddie Reed" />
              <CustomTreeItem itemId="5" label="Georgia Johnson">
                <CustomTreeItem itemId="6" label="Samantha Malone" />
              </CustomTreeItem>
            </CustomTreeItem>
          </SimpleTreeView>
        </Box>
   
    );
  }
                 `}
    </CodeDialog>
  )
}

export default CustomTreeItemCode
