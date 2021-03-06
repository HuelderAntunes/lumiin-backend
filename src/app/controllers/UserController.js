import User from '../models/User'
import File from '../models/File'
import * as Yup from 'yup'
import Mail from '../../lib/Mail'

class UserController {
  async store (req, res) {
    const schema = Yup.object().shape({
      name: Yup.string().required(),
      email: Yup.string().email().required(),
      password: Yup.string().required().min(6),
      role: Yup.number().required().integer()
    })
    if ((!await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Validation fails.' })
    }

    const userExists = await User.findOne({ where: { email: req.body.email } })

    if (userExists) {
      return res.status(400).json({ error: 'User already exists.' })
    }
    console.log('MAIL', Mail)
    await Mail.sendMail({
      to: `${req.body.name} <${req.body.email}>`,
      subject: 'Lumiin account created',
      template: 'invite',
      context: {
        name: req.body.name, email: req.body.email, password: req.body.password
      }
    })
    const { id, name, email, role } = await User.create(req.body)

    return res.json({ id, name, email, role })
  }

  async update (req, res) {
    const schema = Yup.object().shape({
      name: Yup.string(),
      email: Yup.string().email(),
      oldPassword: Yup.string().min(6),
      password: Yup.string().min(6).when('oldPassword', (oldPassword, field) => oldPassword ? field.required() : field),
      confirmPassword: Yup.string().min(6).when('password', (password, field) => password ? field.required().oneOf([Yup.ref('password')]) : field),
      role: Yup.number().integer(),
      avatar: Yup.number().integer()
    })

    if ((!await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Validation fails.' })
    }

    const { email, oldPassword } = req.body

    const user = await User.findByPk(req.userId)

    if (email !== user.email) {
      const userExists = await User.findOne({ where: { email: email } })

      if (userExists) {
        return res.status(400).json({ error: 'User with provided email already exists.' })
      }
    }

    if (oldPassword && !(await user.checkPassword(oldPassword))) {
      return res.status(401).json({ error: 'Password does not match.' })
    }

    await user.update(req.body)

    const { id, name, avatar } = await User.findByPk(req.userId, { include: [{ model: File, as: 'avatar', attributes: ['id', 'path', 'url'] }] })

    return res.json({
      id, name, email, avatar
    })
  }
}

export default new UserController()
