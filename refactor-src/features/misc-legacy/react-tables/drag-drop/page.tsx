import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/shared/ui/PageContainer';
import Rowdragdrop from '@/components/react-tables/drag-drop/Rowdragdrop';
import Columndragdrop from '@/components/react-tables/drag-drop/Columndragdrop'
import Grid from '@/components/compat/Grid2';


const BCrumb = [
    {
        to: "/",
        title: "Home",
    },
    {
        title: "Drag & Drop Table ",
    },
];

function page() {
    return (<>
        <PageContainer title="React Drag & Drop Table" description="this is React  Drag & Drop Table page">
            <Breadcrumb title="Drag & Drop Table " items={BCrumb} />
            <Grid2 container spacing={3}>
                <Grid2 sx={{ padding: 2 }} size={12}>
                    <Rowdragdrop />
                </Grid2>
                <Grid2 sx={{ padding: 2 }} size={12}>
                    <Columndragdrop />
                </Grid2>
            </Grid2>
        </PageContainer>
    </>);
}

export default page;
