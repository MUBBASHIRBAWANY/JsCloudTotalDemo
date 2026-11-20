import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form';
import { toast, ToastContainer } from 'react-toastify';
import Select from 'react-select'
import { createDataFunction, getDataFundtion } from '../../Api/CurdFunctions';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { fetchOpeningInventory } from '../../Redux/Reducers/OpeningInventoryReducer';

const YearEndProcedure = () => {
  const [adminData, setAdminData] = useState([])
  const [openigYear, setOpeningYear] = useState([])
  const [selectedYear, setSelectedYear] = useState([])
  console.log(selectedYear.endDate)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },

  } = useForm();
  const dispstch = useDispatch()
  const navigate = useNavigate()
  const onSubmit = async () => {
    try {
      const submitData = {
        Assets: adminData.Assets,
        Capital: adminData.Capital,
        liabilities: adminData.liabilities,
        Expenses: adminData.Expenses,
        RetainedearningsAccount: adminData.Retainedearnings,
        Revenue: adminData.Revenue,
        startDate: selectedYear.openYear.label,
        dateEnd: selectedYear.endYear.label
      }

      const data = await createDataFunction(`/OpeningInventory/genrateNewYear`, submitData)
      dispstch(fetchOpeningInventory([data]))
      toast.success("year open successfully")
      setTimeout(() => {
        navigate(`/OpeningInventoryView/${data._id}`)

      },1000)

    } catch (err) {
      console.log(err)
    }

  }

  const getdata = async () => {
    const data = await getDataFundtion("/OpeningInventory/GetOnlyYear")
    const id = "68903ec2664155e11db10367"
    const res = await getDataFundtion(`/Administrative/get/${id}`)
    setAdminData(res.data)
    const year = data.map((item) => ({
      value: item.DateStart,
      label: `${item.DateStart} to ${item.DateEnd}`,
      openYear: {
        value: item.DateStart,
        label: `${item.DateStart}`,
      },
      endYear: {
        value: item.DateStart,
        label: `${item.DateEnd}`,
      },
    }))

    setOpeningYear(year)
  }

  useEffect(() => {
    getdata()
  }, [])

  return (
    <div>
      <div>
        <h1 className="text-3xl font-bold text-center  text-gray-800 mb-6">YearEnd </h1>
        <ToastContainer />
        <div>
          <form className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 bg-white p-6 rounded-lg shadow-md mb-6" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label className="block text-gray-700 font-semibold mb-2">Start Date</label>
              <Select
                options={openigYear}
                value={selectedYear.openYear}
                onChange={(e) => setSelectedYear(e)}
              />
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-2">End Date</label>
              <Select
                options={openigYear}
                isDisabled={true}
                value={selectedYear.endYear}
                onChange={(e) => setSelectedYear(e)}
              />
            </div>
            <div className="col-span-1 md:col-span-2 lg:col-span-5 flex justify-end">
              <button
                type="submit"
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Open Year
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default YearEndProcedure