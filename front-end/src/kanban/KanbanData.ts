/**
 * Kanban Data
 * 
 * Mock data and utilities for Kanban board functionality
 */

import { TodoCategory } from '@/types/apps/kanban';

// Import placeholder images (these may need to be adjusted based on actual asset paths)
import img1 from '@/assets/images/kanban/kanban-img-1.jpg';
import img2 from '@/assets/images/kanban/kanban-img-2.jpg';
import img3 from '@/assets/images/kanban/kanban-img-3.jpg';
import img4 from '@/assets/images/kanban/kanban-img-4.jpg';

const KanbanData: TodoCategory[] = [
  {
    id: '1',
    name: 'Todo',
    child: [
      {
        id: '101',
        task: 'This is first task',
        taskImage: img1,
        taskText: '',
        date: '24 july',
        taskProperty: 'Design',
      },
      {
        id: '102',
        task: 'lets do some task on pd',
        taskImage: '',
        taskText:
          'Lorem ipsum dolor sit amet, consectetur adipisicing elit, o eiusmod tempor incid.',
        date: '24 july',
        taskProperty: 'Mobile',
      },
      {
        id: '103',
        task: 'Do some projects on React Native with Flutter',
        taskImage: '',
        taskText: '',
        date: '24 july',
        taskProperty: 'Mobile',
      },
    ],
  },
  {
    id: '2',
    name: 'Progress',
    child: [
      {
        id: '104',
        task: 'Design navigation changes',
        taskImage: '',
        taskText: '',
        date: '24 july',
        taskProperty: 'Mobile',
        category: '',
      },
      {
        id: '105',
        task: 'Battle with fire',
        taskImage: img2,
        taskText: '',
        date: '24 july',
        taskProperty: 'Design',
        category: '',
      },
      {
        id: '106',
        task: 'First design concept',
        taskImage: '',
        taskText: '',
        date: '24 july',
        taskProperty: 'Mobile',
        category: '',
      },
    ],
  },
  {
    id: '3',
    name: 'Pending',
    child: [
      {
        id: '107',
        task: 'Persona development',
        taskImage: '',
        taskText:
          'Create user personas based on the research data to represent different user groups and their characteristics, gols, and behaviors..',
        date: '24 july',
        taskProperty: 'UX Stage',
        category: 'Pending',
      },
      {
        id: '108',
        task: 'Redesign overview',
        taskImage: img3,
        taskText: '',
        date: '14 july',
        taskProperty: 'Design',
        category: 'Pending',
      },
    ],
  },
  {
    id: '4',
    name: 'Done',
    child: [
      {
        id: '109',
        task: 'Usability testing',
        taskImage: img4,
        taskText: '',
        date: '24 july',
        taskProperty: 'Research',
        category: 'Done',
      },
      {
        id: '110',
        task: 'Introduce new navigation',
        taskImage: '',
        taskText: '',
        date: '24 july',
        taskProperty: 'Data Science',
        category: 'Done',
      },
      {
        id: '111',
        task: 'Branding visual identity',
        taskImage: '',
        taskText: '',
        date: '4 july',
        taskProperty: 'Branding',
        category: 'Done',
      },
      {
        id: '112',
        task: 'Competitor research',
        taskImage: '',
        taskText:
          'research competitors and identify weakness and strengths each of them. comparing their product features, quelity...',
        date: '14 july',
        taskProperty: 'UX Stage',
        category: 'Done',
      },
    ],
  },
];

// Extracting unique task properties from KanbanData
const taskPropertiesSet = new Set<string>();

KanbanData.forEach((category) => {
  category.child.forEach((task) => {
    if (task.taskProperty) {
      taskPropertiesSet.add(task.taskProperty);
    }
  });
});

// Convert Set to array
export const TaskProperties = Array.from(taskPropertiesSet);

export default KanbanData;
