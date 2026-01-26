import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/shared/ui/PageContainer';
import StickyTable from '@/features/misc-legacy/react-tables/sticky/page";

const BCrumb = [
    {
        to: "/",
        title: "Home",
    },
    {
        title: "Sticky Table",
    },
];
function page() {
    return (
        <>
            <PageContainer title="React Sticky Table" description="this is React Sticky Table page">
                <Breadcrumb title="Sticky Table" items={BCrumb} />
                <StickyTable />
            </PageContainer>
        </>
    );
}

export default page;
