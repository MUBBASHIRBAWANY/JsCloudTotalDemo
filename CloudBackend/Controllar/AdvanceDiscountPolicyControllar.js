import AdvanceDiscountPolicyModal from "../Modal/AdvanceDiscountPolicyModal.js";

export const getAllAdvanceDiscountPolicy = async (req, res) => {
  try {
    const data = await AdvanceDiscountPolicyModal.find().sort({ value: 1 });
    res.status(200).send(data);
  } catch (err) {
    console.log(err);
    res.status(400).send("some thing went wrong");
  }
};
