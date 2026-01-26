export interface TableType {
  id?: string;
  imgsrc?: string;
  name?: string;
  post?: string;
  pname?: string;
  teams?: any[];
  status?: string;
  budget?: string;
}

// Simple mock data for Table5
export const basicsTableData: TableType[] = [
  {
    id: '1',
    name: 'Sample User',
    post: 'Developer',
    pname: 'Sample Project',
    teams: [],
    status: 'Active',
    budget: '1000',
  },
];
