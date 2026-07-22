import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CmsPageEntity,
  ECmsPageStatus,
} from '../../../../api/cms-page/entities/cms-page.entity';

@Injectable()
export class CmsPageSeedService {
  constructor(
    @InjectRepository(CmsPageEntity)
    private repository: Repository<CmsPageEntity>,
  ) {}

  async run() {
    const pages = [
      {
        title: 'Terms of Service',
        slug: 'terms-of-service',
        locale: 'en',
        status: ECmsPageStatus.PUBLISHED,
        publishedAt: new Date(),
        seoTitle: 'Terms of Service',
        seoDescription: 'Terms of Service of the application',
        content: `
          <h1>Terms of Service</h1>
          <p>Last updated: January 1, 2024</p>
          <h2>1. Introduction</h2>
          <p>Welcome to our application. By using our website and services, you agree to these Terms of Service. Please read them carefully.</p>
          <h2>2. Use of Services</h2>
          <p>You may use our services only as permitted by law. We may suspend or stop providing our services to you if you do not comply with our terms or policies.</p>
          <h2>3. Privacy</h2>
          <p>Our Privacy Policy explains how we treat your personal data and protect your privacy when you use our services.</p>
          <h2>4. Modifying and Terminating our Services</h2>
          <p>We are constantly changing and improving our services. We may add or remove functionalities or features, and we may suspend or stop a service altogether.</p>
          <h2>5. Warranties and Disclaimers</h2>
          <p>We provide our services using a commercially reasonable level of skill and care. However, we do not make specific promises about the services.</p>
        `,
      },
      {
        title: 'Điều khoản dịch vụ',
        slug: 'terms-of-service',
        locale: 'vi',
        status: ECmsPageStatus.PUBLISHED,
        publishedAt: new Date(),
        seoTitle: 'Điều khoản dịch vụ',
        seoDescription: 'Điều khoản dịch vụ của ứng dụng',
        content: `
          <h1>Điều khoản dịch vụ</h1>
          <p>Cập nhật lần cuối: 1 tháng 1, 2024</p>
          <h2>1. Giới thiệu</h2>
          <p>Chào mừng bạn đến với ứng dụng của chúng tôi. Bằng việc sử dụng trang web và dịch vụ của chúng tôi, bạn đồng ý với các Điều khoản dịch vụ này. Vui lòng đọc kỹ.</p>
          <h2>2. Sử dụng dịch vụ</h2>
          <p>Bạn chỉ có thể sử dụng dịch vụ của chúng tôi theo quy định của pháp luật. Chúng tôi có thể đình chỉ hoặc ngừng cung cấp dịch vụ cho bạn nếu bạn không tuân thủ các điều khoản hoặc chính sách của chúng tôi.</p>
          <h2>3. Quyền riêng tư</h2>
          <p>Chính sách bảo mật của chúng tôi giải thích cách chúng tôi xử lý dữ liệu cá nhân của bạn và bảo vệ quyền riêng tư của bạn khi bạn sử dụng dịch vụ của chúng tôi.</p>
          <h2>4. Sửa đổi và chấm dứt dịch vụ</h2>
          <p>Chúng tôi không ngừng thay đổi và cải thiện dịch vụ của mình. Chúng tôi có thể thêm hoặc xóa các chức năng hoặc tính năng và chúng tôi có thể đình chỉ hoặc dừng hoàn toàn một dịch vụ.</p>
          <h2>5. Bảo đảm và từ chối trách nhiệm</h2>
          <p>Chúng tôi cung cấp các dịch vụ của mình bằng cách sử dụng mức độ kỹ năng và sự cẩn thận hợp lý về mặt thương mại. Tuy nhiên, chúng tôi không đưa ra những lời hứa cụ thể về các dịch vụ.</p>
        `,
      },
      {
        title: 'Privacy Policy',
        slug: 'privacy-policy',
        locale: 'en',
        status: ECmsPageStatus.PUBLISHED,
        publishedAt: new Date(),
        seoTitle: 'Privacy Policy',
        seoDescription: 'Privacy Policy of the application',
        content: `
          <h1>Privacy Policy</h1>
          <p>Last updated: January 1, 2024</p>
          <h2>1. Information we collect</h2>
          <p>We collect information to provide better services to all our users. We collect information in the following ways:</p>
          <ul>
            <li>Information you give us. For example, many of our services require you to sign up for an account.</li>
            <li>Information we get from your use of our services. We collect information about the services that you use and how you use them.</li>
          </ul>
          <h2>2. How we use information we collect</h2>
          <p>We use the information we collect from all of our services to provide, maintain, protect and improve them, to develop new ones, and to protect our users.</p>
          <h2>3. Information we share</h2>
          <p>We do not share personal information with companies, organizations and individuals outside of our company unless one of the following circumstances applies:</p>
          <ul>
            <li>With your consent</li>
            <li>For legal reasons</li>
          </ul>
        `,
      },
      {
        title: 'Chính sách bảo mật',
        slug: 'privacy-policy',
        locale: 'vi',
        status: ECmsPageStatus.PUBLISHED,
        publishedAt: new Date(),
        seoTitle: 'Chính sách bảo mật',
        seoDescription: 'Chính sách bảo mật của ứng dụng',
        content: `
          <h1>Chính sách bảo mật</h1>
          <p>Cập nhật lần cuối: 1 tháng 1, 2024</p>
          <h2>1. Thông tin chúng tôi thu thập</h2>
          <p>Chúng tôi thu thập thông tin để cung cấp các dịch vụ tốt hơn cho tất cả người dùng của mình. Chúng tôi thu thập thông tin theo những cách sau:</p>
          <ul>
            <li>Thông tin bạn cung cấp cho chúng tôi. Ví dụ: nhiều dịch vụ của chúng tôi yêu cầu bạn đăng ký tài khoản.</li>
            <li>Thông tin chúng tôi nhận được từ việc bạn sử dụng các dịch vụ của chúng tôi. Chúng tôi thu thập thông tin về các dịch vụ mà bạn sử dụng và cách bạn sử dụng chúng.</li>
          </ul>
          <h2>2. Cách chúng tôi sử dụng thông tin chúng tôi thu thập</h2>
          <p>Chúng tôi sử dụng thông tin thu thập được từ tất cả các dịch vụ của mình để cung cấp, duy trì, bảo vệ và cải thiện chúng, phát triển các dịch vụ mới và bảo vệ người dùng của chúng tôi.</p>
          <h2>3. Thông tin chúng tôi chia sẻ</h2>
          <p>Chúng tôi không chia sẻ thông tin cá nhân với các công ty, tổ chức và cá nhân bên ngoài công ty trừ khi một trong các trường hợp sau áp dụng:</p>
          <ul>
            <li>Với sự đồng ý của bạn</li>
            <li>Vì lý do pháp lý</li>
          </ul>
        `,
      },
    ];

    for (const page of pages) {
      const existing = await this.repository.findOneBy({
        slug: page.slug,
        locale: page.locale,
      });

      if (!existing) {
        await this.repository.save(this.repository.create(page));
      }
    }
  }
}
