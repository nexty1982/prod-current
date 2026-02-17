import { useEffect, useRef, useState } from 'react';

// material-ui
import { Theme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';

// third party
import FullCalendar from '@fullcalendar/react';
import listPlugin from '@fullcalendar/list';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import timelinePlugin from '@fullcalendar/timeline';
import { EventDropArg, EventClickArg, DateSelectArg } from '@fullcalendar/core';
import interactionPlugin, { EventResizeDoneArg } from '@fullcalendar/interaction';

import { FormikValues } from 'formik';

// project imports
import Toolbar from './Toolbar';
import AddEventForm from './AddEventForm';
import CalendarStyled from './CalendarStyled';

import Loader from 'ui-component/Loader';
import MainCard from 'ui-component/cards/MainCard';
import SubCard from 'ui-component/cards/SubCard';

import { dispatch, useSelector } from 'store';
import { getEvents, addEvent, updateEvent, removeEvent } from 'store/slices/calendar';

// assets
import AddAlarmTwoToneIcon from '@mui/icons-material/AddAlarmTwoTone';

// types
import { DateRange } from 'types';

// ==============================|| APPLICATION CALENDAR ||============================== //

export default function Calendar() {
  const calendarRef = useRef<FullCalendar>(null);
  const matchSm = useMediaQuery((theme: Theme) => theme.breakpoints.down('md'));

  const [loading, setLoading] = useState<boolean>(true);

  // fetch events data
  const [events, setEvents] = useState<FormikValues[]>([]);
  const calendarState = useSelector((state) => state.calendar);

  useEffect(() => {
    dispatch(getEvents()).then(() => setLoading(false));
  }, []);

  useEffect(() => {
    setEvents(calendarState.events);
  }, [calendarState]);

  const [date, setDate] = useState(new Date());
  const [view, setView] = useState(matchSm ? 'listWeek' : 'dayGridMonth');

  // calendar toolbar events
  const handleDateToday = () => {
    const calendarEl = calendarRef.current;

    if (calendarEl) {
      const calendarApi = calendarEl.getApi();

      calendarApi.today();
      setDate(calendarApi.getDate());
    }
  };

  const handleViewChange = (newView: string) => {
    const calendarEl = calendarRef.current;

    if (calendarEl) {
      const calendarApi = calendarEl.getApi();

      calendarApi.changeView(newView);
      setView(newView);
    }
  };

  // set calendar view
  useEffect(() => {
    handleViewChange(matchSm ? 'listWeek' : 'dayGridMonth');
  }, [matchSm]);

  const handleDatePrev = () => {
    const calendarEl = calendarRef.current;

    if (calendarEl) {
      const calendarApi = calendarEl.getApi();

      calendarApi.prev();
      setDate(calendarApi.getDate());
    }
  };

  const handleDateNext = () => {
    const calendarEl = calendarRef.current;

    if (calendarEl) {
      const calendarApi = calendarEl.getApi();

      calendarApi.next();
      setDate(calendarApi.getDate());
    }
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRange, setSelectedRange] = useState<DateRange | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<FormikValues | null>(null);

  // calendar event select/add/edit/delete
  const handleRangeSelect = (arg: DateSelectArg) => {
    const calendarEl = calendarRef.current;
    if (calendarEl) {
      const calendarApi = calendarEl.getApi();
      calendarApi.unselect();
    }

    setSelectedRange({
      start: arg.start,
      end: arg.end
    });
    setIsModalOpen(true);
  };

  const handleEventSelect = (arg: EventClickArg) => {
    if (arg.event.id) {
      const selectEvent = events.find((_event: FormikValues) => _event.id === arg.event.id);
      setSelectedEvent(selectEvent as FormikValues[]);
    } else {
      setSelectedEvent(null);
    }
    setIsModalOpen(true);
  };

  const handleEventUpdate = async ({ event }: EventResizeDoneArg | EventDropArg) => {
    try {
      dispatch(
        updateEvent({
          eventId: event.id,
          update: {
            allDay: event.allDay,
            start: event.start,
            end: event.end
          }
        })
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleEventCreate = async (data: FormikValues) => {
    dispatch(addEvent(data));
    handleModalClose();
  };

  const handleUpdateEvent = async (eventId: string, update: FormikValues) => {
    dispatch(updateEvent({ eventId, update }));
    handleModalClose();
  };

  const handleEventDelete = async (id: string) => {
    try {
      dispatch(removeEvent(id));
      handleModalClose();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddClick = () => {
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedEvent(null);
    setSelectedRange(null);
  };

  if (loading) return <Loader />;

  return (
    <MainCard
      title="Event Calendar"
      secondary={
        <Button color="secondary" variant="contained" onClick={handleAddClick}>
          <AddAlarmTwoToneIcon fontSize="small" sx={{ mr: 0.75 }} />
          Add New Event
        </Button>
      }
    >
      <CalendarStyled>
        <Toolbar
          date={date}
          view={view}
          onClickNext={handleDateNext}
          onClickPrev={handleDatePrev}
          onClickToday={handleDateToday}
          onChangeView={handleViewChange}
        />
        <SubCard>
          <FullCalendar
            weekends
            editable
            droppable
            selectable
            events={events}
            ref={calendarRef}
            rerenderDelay={10}
            initialDate={date}
            initialView={view}
            dayMaxEventRows={3}
            eventDisplay="block"
            headerToolbar={false}
            allDayMaintainDuration
            eventResizableFromStart
            select={handleRangeSelect}
            eventDrop={handleEventUpdate}
            eventClick={handleEventSelect}
            eventResize={handleEventUpdate}
            height={matchSm ? 'auto' : 720}
            plugins={[listPlugin, dayGridPlugin, timelinePlugin, timeGridPlugin, interactionPlugin]}
          />
        </SubCard>
      </CalendarStyled>

      {/* Dialog renders its body even if not open */}
      <Dialog maxWidth="sm" fullWidth onClose={handleModalClose} open={isModalOpen} sx={{ '& .MuiDialog-paper': { p: 0 } }}>
        {isModalOpen && (
          <AddEventForm
            event={selectedEvent}
            range={selectedRange}
            onCancel={handleModalClose}
            handleDelete={handleEventDelete}
            handleCreate={handleEventCreate}
            handleUpdate={handleUpdateEvent}
          />
        )}
      </Dialog>
    </MainCard>
  );
}
