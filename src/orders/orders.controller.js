const path = require("path");

// Use the existing order data
const orders = require(path.resolve("src/data/orders-data"));

// Use this function to assigh ID's when necessary
const nextId = require("../utils/nextId");

// MIDDLEWARE
function requiredFieldsValidator(req, res, next) {
  const requiredFields = ["deliverTo", "mobileNumber", "dishes"];
  const data = req.body.data || {};
  for (const field of requiredFields) {
    if (!data[field]) {
      return next({
        status: 400,
        message: `Order must include a ${field}`,
      });
    }
  }

  if (!Array.isArray(data.dishes) || data.dishes.length === 0) {
    return next({
      status: 400,
      message: "Order must include at least one dish",
    });
  }
  for (const index in data.dishes) {
    if (
      !data.dishes[index].quantity ||
      data.dishes[index].quantity === 0 ||
      !Number.isInteger(data.dishes[index].quantity)
    ) {
      return next({
        status: 400,
        message: `Dish ${index} must have a quantity that is an integer greater than 0`,
      });
    }
  }
  res.locals.data = data;
  next();
}

function orderExists(req, res, next) {
  const { orderId } = req.params;
  const foundOrder = orders.find((order) => order.id === orderId);

  if (!foundOrder) {
    return next({
      status: 404,
      message: `Order does not exist: ${orderId}`,
    });
  }
  res.locals.order = foundOrder;
  next();
}

function idValidator(req, res, next) {
  const {
    data: { id, status },
  } = req.body;
  const { orderId } = req.params;
  if (id && id !== orderId) {
    return next({
      status: 400,
      message: `Order id does not match route id. Order: ${id}, Route: ${orderId}.`,
    });
  }

  if (
    !status ||
    !["pending", "preparing", "out-for-delivery", "delivered"].includes(status)
  ) {
    return next({
      status: 400,
      message:
        "Order must have a status of pending, preparing, out-for-delivery, delivered",
    });
  }
  next();
}

function validateStatus(req, res, next) {
  if (res.locals.order.status !== "pending") {
    return next({
      status: 400,
      message: "An order cannot be deleted unless it is pending",
    });
  }
  next();
}

//CRUD
const list = (req, res, next) => {
  res.json({ data: orders });
};

const read = (req, res, next) => {
  res.send({ data: res.locals.order });
};

const create = (req, res, next) => {
  const { data: { deliverTo, mobileNumber, dishes } = {} } = req.body;
  const newOrder = {
    deliverTo,
    mobileNumber,
    dishes,
    id: nextId(),
  };

  orders.push(newOrder);
  res.status(201).json({ data: newOrder });
};

const update = (req, res, next) => {
  if (res.locals.data.hasOwnProperty("id")) {
    delete res.locals.data.id;
  }
  const updatedOrder = Object.assign(res.locals.order, res.locals.data);
  res.json({ data: updatedOrder });
};

const destroy = (req, res, next) => {
  orders.splice(orders.indexOf(res.locals.order), 1);
  res.sendStatus(204);
};

module.exports = {
  list,
  read: [orderExists, read],
  create: [requiredFieldsValidator, create],
  update: [orderExists, requiredFieldsValidator, idValidator, update],
  destroy: [orderExists, validateStatus, destroy],
};