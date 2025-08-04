const createTokenUser = (user) => {
  return { name: user.name, userId: user._id , isPaid: user.isPaid, email : user.email};
};

module.exports = createTokenUser;
