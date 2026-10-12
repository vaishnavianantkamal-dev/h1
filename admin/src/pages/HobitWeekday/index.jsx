import React from "react";
import CategoryBookingsPage from "../../components/booking/CategoryBookingsPage";

const HobitWeekday = () => (
  <CategoryBookingsPage
    categoryName="hobit weekday"
    title="Hobit Weekday"
    description="Manage Hobit Weekday bookings"
    exportFilePrefix="hobit_weekday"
    pageKey="hobit-weekday"
  />
);

export default HobitWeekday;
