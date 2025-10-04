import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/shared/ui/PageContainer';
import SortingTable from '@/features/misc-legacy/react-tables/sorting/page";



const BCrumb = [
  {
    to: "/",
    title: "Home",
  },
  {
    title: "Sorting Table",
  },
];
function page() {
  return (
    <>
      <PageContainer title="React Sorting Table" description="this is React Sorting Table page">
        <Breadcrumb title="Sorting Table" items={BCrumb} />
        <SortingTable />
      </PageContainer>
    </>
  );
}

export default page;
