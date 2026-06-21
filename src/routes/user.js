const app = require("express")
const router = app.Router();
const {User} = require("../../models")

router.put("/:id", async (req, res)=>{

    try {
        
        const id = req.params.id
        const user = await User.findByPk(id)

        if(!user){
            res.json({
                message: "Id not found ."
            })
        }

        const {firstName, lastName} = req.body
        const updatedUser = await user.update({firstName, lastName})
        res.json({
            message: " Upadate success .",
            data: updatedUser
        })
        

    } catch (error) {
        console.log("Error : ",error)
    }

})

router.delete("/:id", async (req, res)=>{

    try {
        const id = req.params.id
        const user = await User.findByPk(id)

        if(!user){
            return res.status(404).json({  
                message: "Id not found."
            })
        }

        await user.destroy();

        return res.json({
            message: "Delete success."
        })

    } catch (error) {
        console.log("Error : ", error)

        return res.status(500).json({
            message: "Server error"
        })
    }

})

router.post('/',async (req,res)=>{
  const firstName = req.body.firstName
  const lastName = req.body.lastName
  const gender = req.body.gender
  const password = req.body.password
  const email = req.body.email
  const isActive = req.body.isActive

  const created = await User.create({firstName, lastName, gender, password, email, isActive}) 

  res.json({
    message :"You added data successfully .",
    data: created
  })

})

router.get('/:id',(req,res)=>{
  const id = req.params.id;
  res.json(
    {
      "message":"Get user's id successfully",
      "data": id
    }
  )
})

//get data to view 
router.get('/',async (req,res)=>{
  const user = await User.findAll({
    order: [['id', 'ASC']]
  })//sort data by id ascending
   
  res.json({
    message:"Get data successfully . ",
    data: user
  })

})

//update user's data
router.patch('/api/v2/users/:id', async (req,res)=> {
  const id = req.params.id

  const firstName = req.body.firstName
  const lastName = req.body.lastName
  const gender = req.body.gender
  const password = req.body.password
  const email = req.body.email
  const isActive = req.body.isActive

    await User.update(
      {
        firstName, lastName, gender, password, email, isActive
      },
      {
        where:{id}
      }
    )

    res.json({
      message:"updated data successfully. "
    })

})

module.exports = router