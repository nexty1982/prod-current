import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/shared/ui/PageContainer';
import ReactBasicTables from '@/features/misc-legacy/react-tables/basic/page';


const BCrumb = [
    {
        to: '/',
        title: 'Home',
    },
    {
        title: ' React Basic Table',
    },
];


function page() {
    return (
        <>
            <PageContainer title="React Basic Table" description="this is React  Basic Table page">
                <Breadcrumb title="React Basic Table" items={BCrumb} />
                <div>
                    <ReactBasicTables />
                </div>
            </PageContainer>
        </>
    )
}

export default page
