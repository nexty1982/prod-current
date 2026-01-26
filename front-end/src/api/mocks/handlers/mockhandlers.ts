import { Contacthandlers } from '@/api/contacts/ContactsData';
import { Chathandlers } from '@/api/chat/Chatdata';
import { Ecommercehandlers } from '@/api/eCommerce/ProductsData';
import { Bloghandlers } from '@/api/blog/blogData';
import { NotesHandlers } from '@/api/notes/NotesData';
import { TicketHandlers } from '@/api/ticket/TicketData';
import { Emailhandlers } from '@/api/email/EmailData';
import { InvoiceHandlers } from '@/api/invoice/invoceLists';
import { Kanbanhandlers } from '@/@/kanban/KanbanData';
import { ChurchHandlers } from '@/api/churches/churchData';

export const mockHandlers = [
  ...Contacthandlers,
  ...Chathandlers,
  ...Ecommercehandlers,
  ...Bloghandlers,
  ...NotesHandlers,
  ...TicketHandlers,
  ...Emailhandlers,
  ...InvoiceHandlers,
  ...Kanbanhandlers,
  ...ChurchHandlers,
];
