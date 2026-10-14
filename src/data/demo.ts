import type { Idiom } from '../types'

/**
 * DỮ LIỆU MINH HỌA — chỉ để xem thử giao diện khi chưa nạp ngữ liệu thật.
 * Không phải ngữ liệu đề thi HSK 5, không gắn tên sách nào. Sẽ tự biến mất khi có public/data/idioms.json.
 */
const d = (
  id: string, hanzi: string, pinyin: string, meaningVi: string, literal: string, figurative: string,
  topic: string, zh: string, py: string, vi: string,
): Idiom => ({ id, hanzi, pinyin, meaningVi, literal, figurative, topic, examples: [{ zh, pinyin: py, vi }] })

export const DEMO_IDIOMS: Idiom[] = [
  d('demo-1', '吃不消', 'chī bù xiāo', 'Không chịu nổi, không kham nổi', 'Ăn không tiêu', 'Không chịu đựng nổi (công việc nặng, thời tiết, áp lực…)', 'Công việc',
    '他连续加班一个星期，身体有点吃不消。', 'Tā liánxù jiābān yí gè xīngqī, shēntǐ yǒudiǎn chī bù xiāo.', 'Anh ấy tăng ca liên tục một tuần, cơ thể hơi không chịu nổi.'),
  d('demo-2', '走后门', 'zǒu hòumén', 'Đi cửa sau, dùng quan hệ để được ưu đãi', 'Đi qua cửa sau', 'Dựa vào quan hệ, đường tắt không chính đáng để đạt mục đích', 'Công việc',
    '他想靠走后门进那家公司，结果被拒绝了。', 'Tā xiǎng kào zǒu hòumén jìn nà jiā gōngsī, jiéguǒ bèi jùjué le.', 'Anh ta muốn đi cửa sau để vào công ty đó, kết quả bị từ chối.'),
  d('demo-3', '碰钉子', 'pèng dīngzi', 'Bị từ chối, vấp phải trở ngại', 'Đụng phải cái đinh', 'Bị người khác từ chối thẳng thừng hoặc gặp trắc trở', 'Giao tiếp',
    '他去找老板谈加薪，结果碰钉子了。', 'Tā qù zhǎo lǎobǎn tán jiāxīn, jiéguǒ pèng dīngzi le.', 'Anh ấy đi nói chuyện tăng lương với sếp, kết quả bị từ chối thẳng.'),
  d('demo-4', '拍马屁', 'pāi mǎpì', 'Nịnh bợ, tâng bốc', 'Vỗ mông ngựa', 'Nịnh nọt cấp trên hoặc người có quyền để lấy lòng', 'Quan hệ giữa người với người',
    '他总是在经理面前拍马屁，同事们都看不惯。', 'Tā zǒngshì zài jīnglǐ miànqián pāi mǎpì, tóngshìmen dōu kàn bu guàn.', 'Anh ta luôn nịnh bợ trước mặt giám đốc, đồng nghiệp đều không ưa.'),
  d('demo-5', '炒鱿鱼', 'chǎo yóuyú', 'Sa thải, đuổi việc', 'Xào mực', 'Bị ông chủ cho nghỉ việc', 'Công việc',
    '他因为经常迟到，被老板炒鱿鱼了。', 'Tā yīnwèi jīngcháng chídào, bèi lǎobǎn chǎo yóuyú le.', 'Anh ấy vì thường xuyên đi muộn nên bị sếp sa thải.'),
  d('demo-6', '吃醋', 'chī cù', 'Ghen (trong tình cảm)', 'Ăn giấm', 'Ghen tuông khi người mình yêu quý để ý đến người khác', 'Cảm xúc',
    '看到女朋友和别的男生聊天，他有点吃醋。', 'Kàndào nǚpéngyou hé bié de nánshēng liáotiān, tā yǒudiǎn chī cù.', 'Thấy bạn gái trò chuyện với con trai khác, anh ấy hơi ghen.'),
  d('demo-7', '开夜车', 'kāi yèchē', 'Thức đêm làm việc hoặc học bài', 'Lái xe ban đêm', 'Thức khuya để làm việc, học bài cho kịp', 'Học tập',
    '为了准备考试，他每天都开夜车。', 'Wèile zhǔnbèi kǎoshì, tā měitiān dōu kāi yèchē.', 'Để chuẩn bị cho kỳ thi, ngày nào cậu ấy cũng thức đêm học bài.'),
  d('demo-8', '唱反调', 'chàng fǎndiào', 'Đối nghịch ý kiến, làm ngược lại', 'Hát điệu ngược', 'Cố ý nói hoặc làm trái với ý kiến của người khác', 'Giao tiếp',
    '他总爱跟大家唱反调，让人很头疼。', 'Tā zǒng ài gēn dàjiā chàng fǎndiào, ràng rén hěn tóuténg.', 'Anh ta cứ thích đối nghịch với mọi người, khiến ai cũng đau đầu.'),
  d('demo-9', '露马脚', 'lòu mǎjiǎo', 'Để lộ sơ hở, lộ chân tướng', 'Lộ chân ngựa', 'Vô tình để lộ bí mật hoặc sự thật vốn muốn che giấu', 'Giao tiếp',
    '小偷说话太多，终于露马脚了。', 'Xiǎotōu shuōhuà tài duō, zhōngyú lòu mǎjiǎo le.', 'Tên trộm nói quá nhiều, cuối cùng đã để lộ sơ hở.'),
  d('demo-10', '泡汤', 'pào tāng', 'Đổ bể, hỏng việc', 'Ngâm trong nước canh', 'Kế hoạch hoặc hy vọng không thành', 'Đời sống hằng ngày',
    '突然下大雨，我们的野餐计划泡汤了。', 'Tūrán xià dàyǔ, wǒmen de yěcān jìhuà pào tāng le.', 'Đột nhiên mưa to, kế hoạch dã ngoại của chúng tôi đổ bể.'),
  d('demo-11', '吹牛', 'chuī niú', 'Nói khoác, ba hoa', 'Thổi con bò', 'Nói quá sự thật để khoe khoang', 'Giao tiếp',
    '他很喜欢吹牛，说自己认识很多名人。', 'Tā hěn xǐhuan chuī niú, shuō zìjǐ rènshi hěn duō míngrén.', 'Anh ta rất thích nói khoác, bảo mình quen nhiều người nổi tiếng.'),
  d('demo-12', '敲竹杠', 'qiāo zhúgàng', 'Chặt chém, lợi dụng để vòi tiền', 'Gõ đòn tre', 'Lợi dụng điểm yếu của người khác để đòi giá cao hoặc tiền', 'Đời sống hằng ngày',
    '那家店给游客敲竹杠，价格贵得离谱。', 'Nà jiā diàn gěi yóukè qiāo zhúgàng, jiàgé guì de lípǔ.', 'Cửa hàng đó chặt chém du khách, giá đắt đến vô lý.'),
]
