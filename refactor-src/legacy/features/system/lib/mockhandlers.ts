import { Contacthandlers } from '@/contacts/ContactsData';
import { Chathandlers } from '@/chat/Chatdata';
import { Ecommercehandlers } from '@/eCommerce/ProductsData';
import { Bloghandlers } from '@/blog/blogData';
import { NotesHandlers } from '@/notes/NotesData';
import { TicketHandlers } from '@/ticket/TicketData';
import { Emailhandlers } from '@/email/EmailData';
import { InvoiceHandlers } from '@/invoice/invoceLists';
import { Kanbanhandlers } from '@/@/kanban/KanbanData';
import { ChurchHandlers } from '@/churches/churchData';

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
