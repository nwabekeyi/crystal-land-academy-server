const {
  hashPassword,
  isPassMatched,
} = require("../../handlers/passHash.handler");
const responseStatus = require("../../handlers/responseStatus.handler");
const Admin = require("../../models/Staff/admin.model");
const generateToken = require("../../utils/tokenGenerator");

/**
 * Register admin service.
 *
 * @param {Object} data - The data containing information about the admin.
 * @param {string} data.firstName - The first name of the admin.
 * @param {string} data.lastName - The last name of the admin.
 * @param {string} [data.middleName] - The middle name of the admin (optional).
 * @param {string} data.email - The email of the admin.
 * @param {string} data.password - The password of the admin.
 * @returns {void} - The created admin object or an error message.
 */
exports.registerAdminService = async (data, res) => {
  const { firstName, lastName, middleName, email, password } = data;

  // Check if admin with the same email already exists
  const isAdminExist = await Admin.findOne({ email });

  if (isAdminExist) {
    return responseStatus(res, 401, "failed", "Email Already in use");
  } else {
    // Create a new admin
    await Admin.create({
      firstName,
      lastName,
      middleName,
      email,
      password: await hashPassword(password),
    });
    return responseStatus(res, 201, "success", "Registration Successful!");
  }
};

/**
 * Login admin service.
 *
 * @param {Object} data - The data containing login information.
 * @param {string} data.email - The email of the admin.
 * @param {string} data.password - The password of the admin.
 * @returns {Object} - The admin user, token, and verification status or an error message.
 */
exports.loginAdminService = async (data, res) => {
  const { email, password } = data;

  // Find the admin user by email
  const user = await Admin.findOne({ email });
  if (!user)
    return responseStatus(res, 405, "failed", "Invalid login credentials");

  // Check if the provided password is valid
  const isPassValid = await isPassMatched(password, user.password);

  if (isPassValid) {
    // Generate a token
    const token = generateToken(user._id);

    const result = {
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        middleName: user.middleName,
        email: user.email,
        role: user.role,
        profilePictureUrl: user.profilePictureUrl,
      },
      token,
    };
    // Return user, token, and verification status
    return responseStatus(res, 200, "success", result);
  } else {
    return responseStatus(res, 405, "failed", "Invalid login credentials");
  }
};

/**
 * Get all admins service.
 *
 * @returns {Array} - An array of all admin users.
 */
exports.getAdminsService = async () => {
  return Admin.find({}).select("-password -createdAt -updatedAt");
};

/**
 * Get single admin profile service.
 *
 * @param {string} id - The ID of the admin user.
 * @returns {Object} - The admin user profile or an error message.
 */
exports.getSingleProfileService = async (id, res) => {
  const user = await Admin.findOne({ _id: id })
    .select("-password -createdAt -updatedAt")
    .populate("academicTerms")
    .populate("programs")
    .populate("academicYears")
    .populate("yearGroups")
    .populate("teachers")
    .populate("classLevels")
    .populate("students");

  if (!user) {
    return responseStatus(res, 201, "failed", "Admin doesn't exist");
  } else {
    return responseStatus(res, 201, "success", user);
  }
};

/**
 * Update single admin service.
 *
 * @param {string} id - The ID of the admin user to be updated.
 * @param {Object} data - The data containing updated information about the admin.
 * @param {string} data.firstName - The updated first name of the admin.
 * @param {string} data.lastName - The updated last name of the admin.
 * @param {string} [data.middleName] - The updated middle name of the admin (optional).
 * @param {string} data.email - The updated email of the admin.
 * @param {string} [data.password] - The updated password of the admin (optional).
 * @returns {Object} - The updated admin object or an error message.
 */
exports.updateAdminService = async (id, data, res) => {
  const { firstName, lastName, middleName, email, password } = data;

  // Check if the updated email already exists on another admin
  const emailTaken = await Admin.findOne({ email });
  if (emailTaken && emailTaken._id.toString() !== id) {
    return responseStatus(res, 400, "failed", "Email is already in use");
  }

  // Prepare update data object
  const updateData = {
    firstName,
    lastName,
    middleName,
    email,
  };

  // If password provided, hash and add it to update data
  if (password) {
    updateData.password = await hashPassword(password);
  }

  // Update admin document
  const updatedAdmin = await Admin.findByIdAndUpdate(id, updateData, {
    new: true,
  }).select("-password -createdAt -updatedAt");

  return responseStatus(res, 201, "success", updatedAdmin);
};
